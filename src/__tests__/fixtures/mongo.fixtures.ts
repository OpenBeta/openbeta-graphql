/* eslint-disable no-empty-pattern */
// To explain the rule for this file: Object destructuring is REQUIRED for vitest fixtures because
// of how they utilize autoloading.
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { ChangeStream, MongoClient } from 'mongodb'
import mongoose from 'mongoose'
import { checkVar, defaultPostConnect } from '../../db'
import MutableAreaDataSource from '../../model/MutableAreaDataSource'
import MutableClimbDataSource from '../../model/MutableClimbDataSource'
import BulkImportDataSource from '../../model/BulkImportDataSource'
import ChangeLogDataSource from '../../model/ChangeLogDataSource'
import MutableMediaDataSource from '../../model/MutableMediaDataSource'
import MutableOrganizationDataSource from '../../model/MutableOrganizationDataSource'
import TickDataSource from '../../model/TickDataSource'
import UserDataSource from '../../model/UserDataSource'
import { MUUID } from 'uuid-mongodb'
import { BaseChangeRecordType, ChangeLogType } from '../../db/ChangeLogType'

/**
 * In-memory Mongo replset used for testing.
 * More portable than requiring user to set up Mongo in a background Docker process.
 * Need a replset to faciliate transactions.
 */
let mongod: MongoMemoryReplSet
let uri: string
let _stream: ChangeStream

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({
    // Stream listener listens on DB denoted by 'MONGO_DBNAME' env var.
    replSet: { count: 1, storageEngine: 'wiredTiger', dbName: checkVar('MONGO_DBNAME') }
  })

  uri = await mongod.getUri(checkVar('MONGO_DBNAME'))
  await mongoose.connect(uri, { autoIndex: false })
  mongoose.set('debug', false) // Set to 'true' to enable verbose mode
  _stream = await defaultPostConnect()
})

afterAll(async () => {
  await _stream.close()
})

interface DbTestContext {
  uri: string
  client: MongoClient
  insertDirectly: (collection: string, documents: any[]) => Promise<void>

  areas: MutableAreaDataSource
  climbs: MutableClimbDataSource
  bulkImport: BulkImportDataSource
  organizations: MutableOrganizationDataSource
  ticks: TickDataSource
  history: ChangeLogDataSource
  media: MutableMediaDataSource
  users: UserDataSource
  changeLog: ChangeLogDataSource

  waitForChanges: (props: WaitProps) => Promise<void>
}

export const dbTest = test.extend<DbTestContext>({
  uri: async ({ }, use) => await use(uri),
  client: async ({ uri }, use) => {
    const client = new MongoClient(uri)
    await use(client)
    await client.close()
  },

  insertDirectly: async ({ task, uri }, use) => {
    /**
     * Bypass Mongoose to insert data directly into Mongo.
     * Useful for inserting data that is incompatible with Mongoose schemas for migration testing.
     * @param collection Name of collection for documents to be inserted into.
     * @param docs Documents to be inserted into collection.
     */
    const insertDirectly = async (collection: string, documents: any[]): Promise<void> => {
      const client = new MongoClient(uri)

      try {
        const database = client.db(task.id)
        const mCollection = database.collection(collection)
        const result = await mCollection.insertMany(documents)

        console.log(`${result.insertedCount} documents were inserted directly into MongoDB`)
      } finally {
        await client.close()
      }
    }

    await use(insertDirectly)
  },

  areas: async ({ }, use) => await use(MutableAreaDataSource.getInstance()),
  climbs: async ({ }, use) => await use(MutableClimbDataSource.getInstance()),
  bulkImport: async ({ }, use) => await use(BulkImportDataSource.getInstance()),
  organizations: async ({ }, use) => await use(MutableOrganizationDataSource.getInstance()),
  ticks: async ({ }, use) => await use(TickDataSource.getInstance()),
  history: async ({ }, use) => await use(ChangeLogDataSource.getInstance()),
  media: async ({ }, use) => await use(MutableMediaDataSource.getInstance()),
  users: async ({ }, use) => await use(UserDataSource.getInstance()),
  changeLog: async ({ }, use) => await use(ChangeLogDataSource.getInstance()),

  waitForChanges: async ({ changeLog, task }, use) => {
    const changeStream = changeLog.changeLogModel.collection.watch<ChangeLogType>()

    async function wait (props: WaitProps): Promise<void> {
      return await new Promise<void>((resolve) => {
        const listener = changeStream.on('change', (doc) => {
          let changes: BaseChangeRecordType[]

          if (doc.operationType === 'insert') {
            changes = doc.fullDocument.changes
          } else if (doc.operationType === 'update') {
            assert(doc.updateDescription.updatedFields?.changes)
            changes = doc.updateDescription.updatedFields?.changes
          } else {
            // we may not know what to do here
            return
          }

          if (changes[0] === undefined) return

          if ((props.count === undefined && changes.length === 1) || changes.length === props.count) {
            resolve()
            listener.close()?.catch(console.warn)
          }
        })
      })
    }

    await use(wait)
    await changeStream.close()
  }
})

interface WaitProps {
  count?: number
  // operation?: AreaOperationType | ClimbEditOperationType
  document: { _id: mongoose.Types.ObjectId | MUUID }
}
