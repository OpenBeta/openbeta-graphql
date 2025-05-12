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
import { inject } from 'vitest'
import { ClimbEditOperationType } from '../../db/ClimbTypes'
import { OperationType } from '../../db/AreaTypes'

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

  waitForChanges: <TReturn> (props: WaitProps, op?: () => Promise<TReturn>) => Promise<TReturn>
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

  waitForChanges: async ({ mongoose }, use) => {
    async function wait<T> (
      props: WaitProps,
      op?: () => Promise<T>
    ): Promise<T> {
      const { document, operation, user } = props
      const match: any = {}
      // match a changeset based on whether the changes include the target document.
      if (document !== undefined) match['fullDocument.changes.fullDocument._id'] = document._id
      if (user !== undefined) match['fullDocument.editedBy'] = user
      if (operation !== undefined) match['fullDocument.operation'] = operation

      const pipeline = [{ $match: match }]
      const stream = mongoose.watch(pipeline, { fullDocument: 'updateLookup' })

      // 1) Trigger the change that should produce the event that we are waiting fot
      const result = (op !== undefined) ? await op() : undefined as T

      // 2) Then wait for it
      await stream.hasNext()
      await stream.next()
      await stream.close()

      return result
    }

    await use(wait)
  }
})

interface WaitProps {
  operation?: OperationType | ClimbEditOperationType
  document?: { _id: mongoose.Types.ObjectId | MUUID }
  user?: MUUID
}
