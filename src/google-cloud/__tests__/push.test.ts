import request from 'supertest'
import express, { } from 'express'
import { googleCloudWebHookRecieverWithValidator, RootEventType } from '../push-subscriber'
import { GCS_CLOUD_BUCKET_ID } from '../index.js'
import inMemoryDB from '../../utils/inMemoryDB'
import { getAreaModel } from '../../db'
import merge from 'deepmerge'
import { MessageHandlingError } from '../bucket'

if (GCS_CLOUD_BUCKET_ID === undefined) {
  throw new Error('We need GCS_CLOUD_BUCKET_ID variable set for tests')
}

const mockBody: Partial<RootEventType> = {
  message: {
    attributes: {
      bucketId: GCS_CLOUD_BUCKET_ID,
      eventType: 'OBJECT_FINALIZE',
      objectId: 'test-object-id'
    },
    data: Buffer.from(JSON.stringify({ id: `${GCS_CLOUD_BUCKET_ID}/test-object-id` })).toString('base64'),
    messageId: 'test-message-id'
  },
  subscription: 'test-subscription'
}

describe('googleCloudWebHookReciever', () => {
  let app: express.Express

  // Helper function to create an express app with the route
  const createApp = (): express.Express => {
    const mockApp = express()
    mockApp.use(express.json())
    const handler = googleCloudWebHookRecieverWithValidator(async (req) => {
      if (req.headers.authorization !== 'evil') return {}
      throw new MessageHandlingError('Unauthorized - Invalid JWT')
    })
    mockApp.post('/gcs-webhook', (req, res) => { void handler(req, res).catch(console.error) })

    return mockApp
  }

  beforeAll(async () => {
    app = createApp()
    await inMemoryDB.connect()
    await getAreaModel().collection.drop()
  })

  afterAll(inMemoryDB.close)

  it('should return 200 and ack the message for a valid OBJECT_FINALIZE event', async () => {
    const response = await request(app)
      .post('/gcs-webhook')
      .send(mockBody)

    expect(response.statusCode).toBe(200)
    expect(response.text).toBe('')
  })

  it('should return 500 if validateGoogleJWT cannot parse the result', async () => {
    const response = await request(app)
      .post('/gcs-webhook')
      .set('Authorization', 'evil')
      .send(mockBody)

    expect(response.statusCode).toBe(500)
  })

  it('should return 500 if the request body is malformed (missing message)', async () => {
    const response = await request(app)
      .post('/gcs-webhook')
      .send({ unreleated: 'Some random payload' })

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual('Error: ' + new MessageHandlingError('malformed data at the hook').message)
  })

  it('should return 500 if the eventType is missing', async () => {
    const override = { message: { attributes: { eventType: undefined } } }
    const response = await request(app)
      .post('/gcs-webhook')
      .send(merge(mockBody, override))

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual('Error: ' + new MessageHandlingError('No discernable event type (body.message.attributes.eventType)').message)
  })

  it('should return 500 if the bucketId does not match GCS_CLOUD_BUCKET_ID', async () => {
    const override: Partial<RootEventType> = {
      message: {
        attributes: {
          bucketId: 'wrong-bucket-id'
        }
      }
    }

    const response = await request(app)
      .post('/gcs-webhook')
      .send(merge(mockBody, override))

    expect(response.statusCode).toBe(500)
    expect(response.body).toEqual('Error: ' + new MessageHandlingError('Request is authentically google, but someone is polluting by pointing their unrelated bucket here (wrong-bucket-id)').message)
  })

  it('should return 500 if decoding GCS data fails', async () => {
    const override = {
      message: {
        data: 'invalid-base64'
      }
    }

    const response = await request(app)
      .post('/gcs-webhook')
      .send(merge(mockBody, override))

    expect(response.statusCode).toBe(500)
    expect(response.body).toBe('Error: ' + new MessageHandlingError('Failed to decode base64 string').message)
  })

  it('should return 500 if media identity cannot be discerned (missing objectId)', async () => {
    const override: Partial<RootEventType> = {
      message: {
        attributes: {
          objectId: undefined
        }
      }
    }

    const response = await request(app)
      .post('/gcs-webhook')
      .send(merge(mockBody, override))

    expect(response.statusCode).toBe(500)
    expect(response.body).toContain('Could not discern a media identity')
  })

  it('should call mediaAdded only for OBJECT_FINALIZE events', async () => {
    const override: Partial<RootEventType> = {
      message: {
        attributes: {
          eventType: 'OBJECT_METADATA_UPDATE'
        }
      }
    }

    const response = await request(app)
      .post('/gcs-webhook')
      .send(merge(mockBody, override))

    expect(response.statusCode).toBe(500)
    expect(response.body).toBe('Error: ' + new MessageHandlingError(`This hook is not designed to process ${override.message?.attributes?.eventType ?? ''} events`).message)
  })
})
