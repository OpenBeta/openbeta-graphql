import { ChangeLogType, BaseChangeRecordType, SupportedCollectionTypes, DocumentKind } from '../../db/ChangeLogType.js'
import { exhaustiveCheck } from '../../utils/helpers.js'

/**
 * Customize to resolve individual fields
 */
const resolvers = {
  History: {
    id: (node: ChangeLogType) => node._id.toString(),
    editedBy: (node: ChangeLogType) => node.editedBy.toUUID().toString()
  },

  Change: {
    changeId: (node: BaseChangeRecordType) => node._id._data,

    updateDescription: ({ updateDescription }: BaseChangeRecordType) =>
      updateDescription == null
        ? ({
            updatedFields: [],
            removedFields: [],
            truncatedArrays: []
          })
        : updateDescription
  },

  Document: {
    __resolveType (node: SupportedCollectionTypes) {
      switch (node.kind) {
        case DocumentKind.areas:
          return 'Area'
        case DocumentKind.climbs:
          return 'Climb'
        case DocumentKind.organizations:
          return 'Organization'
        default:
          return exhaustiveCheck(node.kind)
      }
    }
  }
}

export default resolvers
