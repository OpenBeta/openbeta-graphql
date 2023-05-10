import mongoose from 'mongoose'
import { ChangeStream } from 'mongodb'
import { config } from 'dotenv'
import { enableAllPlugins } from 'immer'

import { getAreaModel } from './AreaSchema.js'
import { getClimbModel } from './ClimbSchema.js'
import { getMediaModel } from './MediaSchema.js'
import { getMediaObjectModel } from './MediaObjectSchema.js'
import { getOrganizationModel } from './OrganizationSchema.js'
import { getTickModel } from './TickSchema.js'
import { getXMediaModel } from './XMediaSchema.js'
import { getPostModel } from './PostSchema.js'
import { getChangeLogModel } from './ChangeLogSchema.js'
import { getExperimentalUserModel } from './UserSchema.js'
import { logger } from '../logger.js'
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

const defaultFn = logger.info.bind(logger, 'DB connected successfully')

export const connectDB = async (onConnected: () => any = defaultFn): Promise<void> => {
  const user = checkVar('MONGO_INITDB_ROOT_USERNAME')
  const pass = checkVar('MONGO_INITDB_ROOT_PASSWORD')
  const server = checkVar('MONGO_SERVICE')
  const rsName = checkVar('MONGO_REPLICA_SET_NAME')
  const scheme = checkVar('MONGO_SCHEME')
  const authDb = checkVar('MONGO_AUTHDB')
  const dbName = checkVar('MONGO_DBNAME')
  const tlsFlag = checkVar('MONGO_TLS')

  logger.info(
    `Connecting to database 'mongodb://${user}:****@${server}'...`
  )
  try {
    // /* eslint-disable @typescript-eslint/no-floating-promises */
    mongoose.connection.on('open', onConnected)

    mongoose.connection.on(
      'error', (e) => {
        logger.error('MongoDB connection error', e)
        process.exit(1)
      }
    )

    await mongoose.connect(
      `${scheme}://${user}:${pass}@${server}/${dbName}?authSource=${authDb}&tls=${tlsFlag}&replicaSet=${rsName}`,
      { autoIndex: false }
    )
  } catch (e) {
    logger.error("Can't connect to db")
    process.exit(1)
  }
}

export const createIndexes = async (): Promise<void> => {
  await getClimbModel().createIndexes()
  await getAreaModel().createIndexes()
  await getMediaModel().createIndexes()
  await getOrganizationModel().createIndexes()
  await getTickModel().createIndexes()
  await getXMediaModel().createIndexes()
  await getPostModel().createIndexes()
  await getMediaObjectModel().createIndexes()
  await getChangeLogModel().createIndexes()
}

export const gracefulExit = async (exitCode: number = 0): Promise<void> => {
  await mongoose.connection.close(function () {
    logger.info('Gracefully exiting.')
    process.exit(exitCode)
  })
}

export const defaultPostConnect = async (): Promise<ChangeStream> => {
  console.log('Kudos!')
  await createIndexes()
  return await streamListener()
}

// eslint-disable-next-line
process.on('SIGINT', gracefulExit).on('SIGTERM', gracefulExit)

export {
  getMediaModel,
  getOrganizationModel,
  getAreaModel,
  getTickModel,
  getClimbModel,
  getChangeLogModel,
  getXMediaModel,
  getPostModel,
  getExperimentalUserModel,
  getMediaObjectModel
}
