import { ChangeLogType, BaseChangeRecordType, SupportedCollectionTypes } from '../../db/ChangeLogType.js'

/**
 * Customize to resolve individual fields
 */
const resolvers = {
  History: {
    id: (node: ChangeLogType) => node._id.toString(),
    editedBy: (node: ChangeLogType) => node.editedBy.toUUID().toString()
  },

  Change: {
    changeId: (node: BaseChangeRecordType) => node._id._data
  },

  Document: {
    __resolveType (node: SupportedCollectionTypes) {
      // @ts-expect-error
      if (node.metadata?.leaf != null) {
        return 'Area'
      }
      // @ts-expect-error
      if (node?.type != null) {
        return 'Climb'
      }
      return null
    }
  }
}

export default resolvers
