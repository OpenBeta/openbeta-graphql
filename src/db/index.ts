import mongoose from 'mongoose'
import { config } from 'dotenv'

import { getAreaModel } from './AreaSchema.js'
import { getClimbModel } from './ClimbSchema.js'
import { getMediaModel } from './MediaSchema.js'
import { logger } from '../logger.js'
import { getClimbHistoryModel, getAreaHistoryModel } from './ClimbHistorySchema.js'

config()

export const checkVar = (name: string): string => {
  const value = process.env[name] ?? ''
  if (value === '') {
    logger.error('Missing env ', name)
    process.exit(1)
  }
  return value
}

const defaultFn = logger.info.bind(console, 'DB connected successfully')

export const connectDB = (onConnected: () => any = defaultFn): any => {
  const user = checkVar('MONGO_INITDB_ROOT_USERNAME')
  const pass = checkVar('MONGO_INITDB_ROOT_PASSWORD')
  const server = checkVar('MONGO_SERVICE')

  logger.info(
    `Connecting to database 'mongodb://${user}:****@${server}'...`
  )
  try {
    /* eslint-disable @typescript-eslint/no-floating-promises */
    mongoose.connect(
    `mongodb://${user}:${pass}@${server}:27017/opentacos?authSource=admin&readPreference=primary&ssl=false&replicaSet=rs0`,
    { autoIndex: false }
    )

    mongoose.connection.on('open', onConnected)

    mongoose.connection.on(
      'error', (e) => {
        console.error('MongoDB connection error', e)
        process.exit(1)
      }
    )
  } catch (e) {
    console.error("Can't connect to db")
    process.exit(1)
  }
}

export const createIndexes = async (): Promise<void> => {
  await getClimbModel().ensureIndexes()
  await getAreaModel().ensureIndexes()
  await getMediaModel().ensureIndexes()
}
export const gracefulExit = (exitCode: number = 0): void => {
  mongoose.connection.close(function () {
    logger.info('Gracefully exiting.')
    process.exit(exitCode)
  })
}

process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit)

export { getMediaModel, getAreaModel, getClimbModel, getClimbHistoryModel, getAreaHistoryModel }
