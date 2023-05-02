import { ChangeLogType, BaseChangeRecordType, SupportedCollectionTypes, DocumentKind } from '../../db/ChangeLogType.js'
import { AuthorMetadata } from '../../types.js'
import { exhaustiveCheck, getUserNickFromMediaDir } from '../../utils/helpers.js'

/**
 * History schama field resolvers
 */
const resolvers = {
  History: {
    id: (node: ChangeLogType) => node._id.toString(),
    editedBy: (node: ChangeLogType) => node.editedBy.toUUID().toString(),
    editedByUser: async (node: ChangeLogType) => (await getUserNickFromMediaDir(node.editedBy.toUUID().toString()))
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
  },

  AuthorMetadata: {
    createdBy: (node: AuthorMetadata) => node?.createdBy?.toUUID().toString(),
    updatedBy: (node: AuthorMetadata) => node?.updatedBy?.toUUID().toString(),
    createdByUser: async (node: AuthorMetadata) => await getUserNickFromMediaDir(node?.createdBy?.toUUID().toString() ?? ''),
    updatedByUser: async (node: AuthorMetadata) => (await getUserNickFromMediaDir(node?.updatedBy?.toUUID().toString() ?? ''))
  }
}

export default resolvers
