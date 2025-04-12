import { GCS_BUCKET_CLIENT_EMAIL, GCS_CLOUD_BUCKET_ID as ID, GCS_MEDIA_HOOK_URL, GCS_NOTIFICATIONS_SUBSCRIPTION, GCS_PRIVATE_KEY } from '../index.js'
import { googleStorage } from '../gcs-storage'
import { gcsTopicSubscription } from '../pull-subscriber'
import { Message } from '@google-cloud/pubsub'
import express from 'express'
import { randomUUID } from 'crypto'
import { googleCloudWebHookRecieverWithValidator } from '../push-subscriber.js'
import { validateGoogleJWT } from '../google-auth.js'
import bodyParser from 'body-parser'
import { EventEmitter } from 'events'
import { logger } from '../../logger.js'

function runIf (condition: boolean): typeof describe {
  return (condition) ? describe : describe.skip
}

const GCS_CLOUD_BUCKET_ID = ID ?? 'GCS_CLOUD_BUCKET_ID'
const PUBLIC_HOOK = process.env.GCS_MEDIA_HOOK_PUBLIC
const requirePublicWebHookInstrumentation = runIf(PUBLIC_HOOK !== undefined && PUBLIC_HOOK !== '')
const requireAuth = runIf(GCS_PRIVATE_KEY !== undefined && GCS_BUCKET_CLIENT_EMAIL !== undefined && GCS_PRIVATE_KEY !== '' && GCS_BUCKET_CLIENT_EMAIL !== '')
const requirePullSub = runIf(GCS_NOTIFICATIONS_SUBSCRIPTION !== undefined && GCS_NOTIFICATIONS_SUBSCRIPTION !== '')

requireAuth('Google cloud services integration tests', () => {
  const storage = googleStorage()
  const bucket = storage.bucket(GCS_CLOUD_BUCKET_ID ?? '')

  async function uploadSmallObject (objectName: string, content?: string): Promise<void> {
    if (!objectName.endsWith('.test')) {
      objectName += '.test'
    }
    const file = bucket.file(objectName)
    await file.save(content ?? objectName)
  };

  beforeAll(async () => {
    const [files] = await bucket.getFiles()
    // delete all files that have a .test descriptor
    await Promise.all(files.filter(file => file.name.includes('.test')).map(async file => await file.delete()))
  })

  test('Auth check', async () => await storage.authClient.getClient())
  test('Can read files with no error', async () => await bucket.getFiles())
  test('Can upload files', async () => {
    const files = ['1', '2', '3', '4'].map(i => `${i}.test`)

    for (const filename of files) {
      const file = bucket.file(filename)
      await expect(file.download()).rejects.toThrow(`No such object: ${GCS_CLOUD_BUCKET_ID}/${filename}`)
    }

    await Promise.all(files.map(async (f) => await uploadSmallObject(f)))

    for (const filename of files) {
      const file = bucket.file(filename)
      const [buffer] = await file.download()
      expect(buffer.toString('utf8')).toBe(filename)
    }
  })

  test('Can delete files', async () => {
    const files = ['1', '2', '3', '4'].map(i => `${process.uptime()}.test`)
    await Promise.all(files.map(async (f) => await uploadSmallObject(f)))
    await Promise.all(files.map(async filename => await bucket.file(filename, {}).delete()))
  })

  test('Can sign urls for users', async () => {
    const file = process.uptime().toString() + '.test'
    const message = 'HELLO, WORLD!'
    const [url] = await bucket.file(file).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 1000
    })

    expect(await fetch(url, { body: message, method: 'PUT' }).then(res => res.status)).toBe(200)

    const [buffer] = await bucket.file(file).download()
    expect(buffer.toString('utf8')).toBe(message)
  })

  requirePublicWebHookInstrumentation('FULL integration test instrumented from end to end', () => {
    const endpoint = PUBLIC_HOOK ?? ''
    let server: ReturnType<typeof app.listen>
    let app: express.Express
    const validationToken = randomUUID()
    const emitter = new EventEmitter()

    beforeAll((done) => {
      if (GCS_MEDIA_HOOK_URL === undefined) throw new Error('Cannot do integration tests without GCS_MEDIA_HOOK_URL set')
      app = express()
      app.get(GCS_MEDIA_HOOK_URL, (_, res) => res.send(validationToken))
      const handler = googleCloudWebHookRecieverWithValidator(validateGoogleJWT)
      app.post(GCS_MEDIA_HOOK_URL, bodyParser.json(), (req, res) => { void handler(req, res).then(() => emitter.emit('request', { req })).catch(err => emitter.emit('request', { req, err })) })

      server = app.listen(4000, () => {
        done()
      })
    })

    afterAll((done) => {
      server.close(() => {
        logger.info('integration test server stopped')
        done()
      })
    })

    test('Endpoint hosted by THIS TEST is reachable', async () => {
      await expect(await fetch(endpoint).then(resp => resp.status)).toBe(200)
      await expect(await fetch(endpoint).then(async resp => await resp.text())).toBe(validationToken)
    })
    test('Endpoint supports TLS (if not, google will not post here)', async () => {
      expect(new URL(endpoint).protocol).toBe('https:')
    })

    test('Hook is open to post requests', async () => {
      const resp = await fetch(endpoint, { body: JSON.stringify({ }), method: 'POST' })
      expect(resp.status).not.toBe(404)
      expect(await resp.text()).toBe('"Error: Unauthorized - Missing or invalid Authorization header"')
    })

    test('Subscriber is pushing notifications to hook', async () => {
      const Authorization = randomUUID() // random for each test to prevent false positives from race
      fetch(endpoint, { headers: { Authorization }, body: JSON.stringify({ }), method: 'POST' }).catch(err => { throw err })

      await new Promise((resolve, reject) => {
        emitter.on('request', ({ req, err }: { req: Request, err?: Error }) => {
          if ((req.headers as any).authorization !== Authorization) return
          if (err != null) return reject(err)
          return resolve(Authorization)
        })

        setTimeout(() => reject(new Error('timeout waiting for google to post us back')), 5_000)
      })
    })
  })

  requirePullSub('Google pull subscriber integration santiy checks', () => {
    async function waitForObject (objectname: string): Promise<Message> {
      const sub = gcsTopicSubscription()

      return await new Promise((resolve, reject) => {
        sub.on('message', (message) => {
          if (message.attributes.objectId === objectname || message.attributes.objectId === objectname + '.test') {
            message.ack()
            sub.removeAllListeners()
            resolve(message)
          }
        })

        // Set a timeout to prevent indefinite hanging
        const timeoutId = setTimeout(() => {
          sub.removeAllListeners()
          reject(new Error('Timeout to connect to Pub/Sub subscription'))
        }, 10_000)

        sub.once('error', (err) => { reject(err); clearTimeout(timeoutId) })
      })
    }

    test('Auth', async () => {
      const objectname = process.uptime().toString()
      uploadSmallObject(objectname, 'yay!').catch(err => { throw err })
      await waitForObject(objectname)
    })
  })
})
