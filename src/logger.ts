import pino from 'pino'
import { createWriteStream } from 'pino-logflare'

const setupLogFlare = (apiKey?: string, sourceToken?: string): any | undefined => {
  if (typeof apiKey !== 'undefined' && typeof sourceToken !== 'undefined') {
    return createWriteStream({
      apiKey,
      sourceToken
    })
  }
  return undefined
}

export const logger = pino({
  stream: setupLogFlare(process.env.LOGFLARE_API_KEY, process.env.LOGFLARE_SOURCE_TOKEN),
  name: 'openbeta-graphql',
  level: 'info'
})
