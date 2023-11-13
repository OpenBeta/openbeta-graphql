import mongoose, { ConnectOptions } from 'mongoose'
import { ChangeStream, MongoClient } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { defaultPostConnect, checkVar } from '../db/index.js'
import { logger } from '../logger.js'

/**
 * In-memory Mongo replset used for testing.
 * More portable than requiring user to set up Mongo in a background Docker process.
 * Need a replset to faciliate transactions.
 */
let mongod: MongoMemoryReplSet
let stream: ChangeStream

/**
 * Connect to the in-memory database.
 */
const connect = async (): Promise<void> => {
  mongod = await MongoMemoryReplSet.create({
    // Stream listener listens on DB denoted by 'MONGO_DBNAME' env var.
    replSet: { count: 1, storageEngine: 'wiredTiger', dbName: checkVar('MONGO_DBNAME') }
  })
  const uri = await mongod.getUri(checkVar('MONGO_DBNAME'))
  logger.info(`Connecting to in-memory database ${uri}`)
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

/**
 * Bypass Mongoose to insert data directly into Mongo.
 * Useful for inserting data that is incompatible with Mongoose schemas for migration testing.
 * @param collection Name of collection for documents to be inserted into.
 * @param docs Documents to be inserted into collection.
 */
const insertDirectly = async (collection: string, documents: any[]): Promise<void> => {
  const uri = await mongod.getUri(checkVar('MONGO_DBNAME'))
  const client = new MongoClient(uri)
  try {
    const database = client.db(checkVar('MONGO_DBNAME'))
    const mCollection = database.collection(collection)
    const result = await mCollection.insertMany(documents)

    console.log(`${result.insertedCount} documents were inserted directly into MongoDB`)
  } finally {
    void client.close()
  }
}

export interface InMemoryDB {
  connect: () => Promise<void>
  close: () => Promise<void>
  clear: () => Promise<void>
  insertDirectly: (collection: string, documents: any[]) => Promise<void>
}

export default { connect, close, clear, insertDirectly }
