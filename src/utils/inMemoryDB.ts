import mongoose, { ConnectOptions } from 'mongoose'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { defaultPostConnect } from '../db/index.js'

/**
 * In-memory Mongo replset used for testing.
 * More portable than requiring user to set up Mongo in a background Docker process.
 * Need a replset to faciliate transactions.
 */
const mongod = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: 'wiredTiger' }
})

/**
 * Connect to the in-memory database.
 */
const connect = async (): Promise<void> => {
  const uri = await mongod.getUri()

  const mongooseOpts: ConnectOptions = {
    autoIndex: false // Create indices using defaultPostConnect instead.
  }

  await mongoose.connect(uri, mongooseOpts)
  await defaultPostConnect()
}

/**
 * Drop database, close the connection and stop mongod.
 */
const close = async (): Promise<void> => {
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

export default { connect, close, clear }
