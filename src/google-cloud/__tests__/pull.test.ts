import { Message, PubSub, Subscription } from '@google-cloud/pubsub'
import { handleMessageOnChannel } from '../pull-subscriber'
import { Subscriber } from '@google-cloud/pubsub/build/src/subscriber'
import { GCS_CLOUD_BUCKET_ID } from '../index.js'
import { PubsubMessage } from '@google-cloud/pubsub/build/src/publisher'
import { MessageHandlingError } from '../adapter-interface'
import merge from 'deepmerge'
import { MessageType } from '../push-subscriber'
import inMemoryDB from '../../utils/inMemoryDB'
import { jest } from '@jest/globals'

if (GCS_CLOUD_BUCKET_ID === undefined) throw new Error('We cannot run this test without a bucketID')

const mockMessage: PubsubMessage = {
  attributes: {
    bucketId: GCS_CLOUD_BUCKET_ID,
    eventType: 'OBJECT_FINALIZE',
    objectId: 'test-object-id'
  },
  data: Buffer.from(JSON.stringify({ id: `${GCS_CLOUD_BUCKET_ID}/test-object-id` })).toString('base64'),
  messageId: 'test-message-id'
}

describe('Message handlers for pull-pattern GCS subscribers', () => {
  const dummy = new PubSub()
  const subscriber = new Subscriber(new Subscription(dummy, 'test'))

  // Our handler will take a trip past the database so we will need to provision the
  // database for this suite of tests
  beforeAll(async () => { await inMemoryDB.connect() })
  afterAll(async () => await inMemoryDB.close())

  async function message (override: Partial<MessageType>): Promise<void> {
    const obj = new Message(subscriber, { message: merge(mockMessage, override) })

    obj.ack = jest.fn(() => {})
    obj.nack = jest.fn(() => {})

    return await handleMessageOnChannel(obj)
  }

  it('should succeed at basic validation', async () => await message({}))

  it('should throw if the eventType is missing', async () => {
    const override = { attributes: { eventType: undefined } }
    await expect(message(override))
      .rejects
      .toThrow(new MessageHandlingError('No discernable event type (body.message.attributes.eventType)'))
  })

  it('should throw if the bucketId does not match GCS_CLOUD_BUCKET_ID', async () => {
    const override: MessageType = {
      attributes: {
        bucketId: 'wrong-bucket-id'
      }
    }
    await expect(message(override))
      .rejects
      .toThrow(new MessageHandlingError('Request is authentically google, but someone is polluting by pointing their unrelated bucket here (wrong-bucket-id)'))
  })

  it('should throw if media identity cannot be discerned (missing objectId)', async () => {
    const override: Partial<MessageType> = {
      attributes: {
        objectId: undefined
      }
    }

    await expect(message(override))
      .rejects
      .toThrow(new MessageHandlingError('Could not discern media identity (objectId Missing)'))

    await expect(message({
      attributes: {
        objectId: ''
      }
    }))
      .rejects
      .toThrow(new MessageHandlingError('Could not discern media identity (objectId Missing)'))
  })

  it('should call mediaAdded only for OBJECT_FINALIZE events', async () => {
    const override: Partial<MessageType> = {
      attributes: {
        eventType: 'OBJECT_METADATA_UPDATE'
      }
    }

    await expect(message(override))
      .rejects
      .toThrow(new MessageHandlingError(`This hook is not designed to process ${override.attributes?.eventType ?? 'undefined'} events`))
  })
})
