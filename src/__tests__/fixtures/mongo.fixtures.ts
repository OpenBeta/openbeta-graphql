/* eslint-disable no-empty-pattern */
// To explain the rule for this file: Object destructuring is REQUIRED for vitest fixtures because
// of how they utilize autoloading.
import { MongoClient } from 'mongodb'
import mongoose, { Connection } from 'mongoose'
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
import { logger } from '../../logger'
import { inject } from 'vitest'

interface DbTestContext {
  uri: string
  client: MongoClient
  mongoose: Connection

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
  uri: async ({ }, use) => await use(inject('uri')),
  client: [async ({ uri }, use) => {
    const client = new MongoClient(uri)
    await client.connect()
    await use(client)
    await client.close()
  }, { auto: true }],

  mongoose: [async ({ uri }, use) => {
    await mongoose.connect(uri)
    await use(mongoose.connection)
  }, { auto: true }],

  areas: async ({ }, use) => await use(MutableAreaDataSource.getInstance()),
  climbs: async ({ }, use) => await use(MutableClimbDataSource.getInstance()),
  bulkImport: async ({ }, use) => await use(BulkImportDataSource.getInstance()),
  organizations: async ({ }, use) => await use(MutableOrganizationDataSource.getInstance()),
  ticks: async ({ }, use) => await use(TickDataSource.getInstance()),
  history: async ({ }, use) => await use(ChangeLogDataSource.getInstance()),
  media: async ({ }, use) => await use(MutableMediaDataSource.getInstance()),
  users: async ({ }, use) => await use(UserDataSource.getInstance()),
  changeLog: async ({ }, use) => await use(ChangeLogDataSource.getInstance()),

  waitForChanges: async ({ changeLog }, use) => {
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
            listener.close()?.catch(logger.warn)
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
