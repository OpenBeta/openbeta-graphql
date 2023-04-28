import mongoose, { ConnectOptions } from 'mongoose'
import { ChangeStream } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { defaultPostConnect, checkVar } from '../db/index.js'
import { logger } from '../logger.js'

/**
 * In-memory Mongo replset used for testing.
 * More portable than requiring user to set up Mongo in a background Docker process.
 * Need a replset to faciliate transactions.
 */
const mongod = await MongoMemoryReplSet.create({
  // Stream listener listens on DB denoted by 'MONGO_DBNAME' env var.
  replSet: { count: 1, storageEngine: 'wiredTiger', dbName: checkVar('MONGO_DBNAME') }
})
let stream: ChangeStream

/**
 * Connect to the in-memory database.
 */
const connect = async (): Promise<void> => {
  const uri = await mongod.getUri(checkVar('MONGO_DBNAME'))
  logger.info(`Connecting to database ${uri}`)
  const mongooseOpts: ConnectOptions = {
    autoIndex: false // Create indices using defaultPostConnect instead.
  }

  await mongoose.connect(uri, mongooseOpts)
  stream = await defaultPostConnect()
}

/**
 * Drop database, close the connection and stop mongod.
 */
const close = async (): Promise<void> => {
  await stream.close()
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
  await mongod.stop()
}

/**
 * Remove all the data for all db collections.
 */
const clear = async (): Promise<void> => {
  const collections = mongoose.connection.collections

  for (const key in collections) {
    const collection = collections[key]
    await collection.deleteMany({})
  }
}

export interface InMemoryDB {
  connect: () => Promise<void>
  close: () => Promise<void>
  clear: () => Promise<void>
}

export default { connect, close, clear }
