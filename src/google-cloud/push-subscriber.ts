import { Request, Response } from 'express'
import { logger } from '../logger.js'
import { JwtValidator } from './google-auth.js'
import { mediaAdded } from './adapter-interface.js'
import { GCS_CLOUD_BUCKET_ID } from './index.js'
import { MessageHandlingError, MediaIdentity } from './bucket.js'

export interface RootEventType {
  message: MessageType
  subscription: string
}

export interface MessageType {
  attributes: Partial<MessageAttributes>
  data?: string
  messageId?: string
  message_id?: string
  publishTime?: string
  publish_time?: string
}

export interface MessageAttributes extends Partial<{
  bucketId: string
  eventTime: string
  eventType: string
  notificationConfig: string
  objectGeneration: string
  objectId: string
  payloadFormat: string
}> {}

export interface GCSMessageData {
  kind: string
  id: string
  selfLink: string
  name: string
  bucket: string
  generation: string
  metageneration: string
  contentType: string
  timeCreated: string
  updated: string
  storageClass: string
  timeStorageClassUpdated: string
  size: string
  md5Hash: string
  mediaLink: string
  crc32c: string
  etag: string
}

function decodeGCSData (data: string | undefined): GCSMessageData {
  if (data === undefined) {
    throw new MessageHandlingError('FAILURE: <decodeGCSData> -> Attempt to decode empty data string')
  }

  try {
    // Decode the base64 encoded data
    const base64Encoded = data
    const decodedString = Buffer.from(base64Encoded, 'base64').toString('utf-8')

    // Parse the JSON string
    return JSON.parse(decodedString)
  } catch (error) {
    logger.error(error)
    throw new MessageHandlingError('Failed to decode base64 string')
  }
}

/**
 * You may not necessarily have a straightforward to develop and test with this,
 * as it requires some external service to post a webhook here (If you use ngrok
 * or something like that, then obviously this is not the case) but otherwise
 * you may struggle.
 *
 * To see why we would use this rather than the subscriber API you can take a look in the readme
 *
 * The hook reciever may recieve all manner of data through this endpoint but mostly
 * we are interested in recognising events that we are waiting for and dispatching
 * them to the shared logic.
 *
 * The auth here is unique compared to other parts of this application and that opens up
 * a couple of challenges to us if middlewares start getting too involved before the
 * webhook can make it down here.
 *
 * Google Cloud Services have a concept called Service Accounts (see readme) which
 * can generate and authenticate using signed tokens.
 */
export async function googleCloudWebHookReciever (req: Request, res: Response, validator: JwtValidator): Promise<void> {
  try {
    await validator(req)
    const body: Partial<RootEventType> = validateBody(req)
    const media: MediaIdentity = extractMediaIdentity(body)
    await mediaAdded(media)
    // When we set the status as 200 google will consider this message as being ack'd, and will not
    // dispatch it again to the endpoint - essentially consuming it. This is crucial to prevent
    // message choking.
    res.status(200).send()
    logger.info(`ACK to message ${body?.message?.messageId ?? 'unkown message id'}`)
  } catch (error) {
    logger.debug(`Error in GCS message handler. message: ${JSON.stringify(req.body)}`)
    res.status(500).json(error?.toString()).send()
  }
}

/**
 * Check that the body of an incoming request contains the data that we need to identify media
 * in our own system
 */
function extractMediaIdentity (body: Partial<RootEventType>): MediaIdentity {
  const media: MediaIdentity = {
    objectId: body?.message?.attributes?.objectId ?? ''
  }

  if (media.objectId === '') {
    throw new MessageHandlingError(`Could not discern a media identity: ${JSON.stringify(media)}`)
  }

  return media
}

/** Check that the body of an incoming request looks like the kind we expect from google */
function validateBody (req: Request): Partial<RootEventType> {
  const body: Partial<RootEventType> = req.body
  if (body.message === undefined) {
    throw new MessageHandlingError(
      'malformed data at the hook'
    )
  }

  validateMessageAttributes(body.message.attributes)

  // This does produce relevant data but we have it here as a validation step
  // and no more. if you are experiencing fragility you can try without it.
  decodeGCSData(body.message?.data)

  return body
}

export function validateMessageAttributes (attributes: Partial<MessageAttributes>): void {
  const eventType = attributes?.eventType
  if (eventType === undefined) throw new MessageHandlingError('No discernable event type (body.message.attributes.eventType)')
  if (eventType !== 'OBJECT_FINALIZE') {
    throw new MessageHandlingError(`This hook is not designed to process ${eventType ?? 'undefined'} events`)
  }

  if (attributes?.bucketId === undefined) {
    throw new MessageHandlingError('Request is authentically google, but target bucketid was not set')
  }

  if (attributes.bucketId !== GCS_CLOUD_BUCKET_ID) {
    logger.warn(`Recieved a notification for the wrong bucket: ${attributes.bucketId}`)
    throw new MessageHandlingError(`Request is authentically google, but someone is polluting by pointing their unrelated bucket here (${attributes.bucketId})`)
  }
}

/** Hoc to leverage partial application against the reciever */
export function googleCloudWebHookRecieverWithValidator (validator: JwtValidator): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => await googleCloudWebHookReciever(req, res, validator)
}
