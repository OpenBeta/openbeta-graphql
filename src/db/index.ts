import mongoose from 'mongoose'
import { config } from 'dotenv'
import { enableAllPlugins } from 'immer'

import { getAreaModel } from './AreaSchema.js'
import { getClimbModel } from './ClimbSchema.js'
import { getMediaModel } from './MediaSchema.js'
import { getTickModel } from './TickSchema.js'
import { logger } from '../logger.js'
import { getClimbHistoryModel, getAreaHistoryModel } from './ClimbHistorySchema.js'
import streamListener from './edit/streamListener.js'

config()
enableAllPlugins()

export const checkVar = (name: string): string => {
  const value = process.env[name] ?? ''
  if (value === '') {
    logger.error('Missing env ', name)
    process.exit(1)
  }
  return value
}

const defaultFn = logger.info.bind(console, 'DB connected successfully')

export const connectDB = async (onConnected: () => any = defaultFn): Promise<any> => {
  const user = checkVar('MONGO_INITDB_ROOT_USERNAME')
  const pass = checkVar('MONGO_INITDB_ROOT_PASSWORD')
  const server = checkVar('MONGO_SERVICE')

  logger.info(
    `Connecting to database 'mongodb://${user}:****@${server}'...`
  )
  try {
<<<<<<< HEAD
    /* eslint-disable @typescript-eslint/no-floating-promises */
    mongoose.connect(
      `mongodb://${user}:${pass}@${server}:27017/opentacos?authSource=admin`,
      { autoIndex: false }
    )

=======
    // /* eslint-disable @typescript-eslint/no-floating-promises */
>>>>>>> a5b83ca (Edit history poc (#89))
    mongoose.connection.on('open', onConnected)

    mongoose.connection.on(
      'error', (e) => {
        console.error('MongoDB connection error', e)
        process.exit(1)
      }
    )
    await mongoose.connect(
      `mongodb://${user}:${pass}@${server}:27017/opentacos?authSource=admin&readPreference=primary&ssl=false&replicaSet=rs0`,
      { autoIndex: false }
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
  await getTickModel().ensureIndexes()
}
export const gracefulExit = async (exitCode: number = 0): Promise<void> => {
  await mongoose.connection.close(function () {
    logger.info('Gracefully exiting.')
    process.exit(exitCode)
  })
}

export const defaultPostConnect = async (): Promise<void> => {
  // getMediaModel()
  // await createIndexes()
  console.log('Kudos!')
  await streamListener(mongoose.connection)
}

// eslint-disable-next-line
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit)

export { getMediaModel, getAreaModel, getClimbModel, getClimbHistoryModel, getAreaHistoryModel }
