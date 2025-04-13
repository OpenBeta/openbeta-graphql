import { Message, PubSub, StatusError, Subscription } from '@google-cloud/pubsub'
import { logger } from '../logger.js'
import { GCS_BUCKET_CLIENT_EMAIL, GCS_CLOUD_BUCKET_ID, GCS_NOTIFICATIONS_SUBSCRIPTION, GCS_PRIVATE_KEY } from './index.js'
import { mediaAdded } from './adapter-interface.js'
import { validateMessageAttributes } from './push-subscriber.js'
import { MediaIdentity, MessageHandlingError } from './bucket.js'

// Initialize the Pub/Sub client
const pubSubClient = new PubSub({
  projectId: GCS_CLOUD_BUCKET_ID,
  credentials: {
    type: 'service_account',
    private_key: GCS_PRIVATE_KEY,
    client_email: GCS_BUCKET_CLIENT_EMAIL
  }
})

export function gcsTopicSubscription (): Subscription {
  return pubSubClient.subscription(GCS_NOTIFICATIONS_SUBSCRIPTION ?? '')
}

export async function handleErrorFromBucket (error: StatusError): Promise<void> {
  logger.error(`Google cloud produced a status error ${error.message} (${JSON.stringify(error)})`)
}

export async function handleMessageOnChannel (message: Message): Promise<void> {
  try {
    validateMessageAttributes(message.attributes)

    const media: MediaIdentity = {
      objectId: message.attributes.objectId
    }

    if (media.objectId === '' || media.objectId === undefined) {
      throw new MessageHandlingError('Could not discern media identity (objectId Missing)')
    }

    await mediaAdded(media)
  } catch (e) {
    message.nack()
    throw e
  }

  message.ack()
}
