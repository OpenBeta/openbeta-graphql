import pino from 'pino'

export const logger = pino({
  name: 'openbeta-graphql',
  level: 'debug'
})
