import { ChangeLogType, BaseChangeRecordType, SupportedCollectionTypes, DocumentKind } from '../../db/ChangeLogType'
import { AuthorMetadata, DataSourcesType } from '../../types'
import { exhaustiveCheck } from '../../utils/helpers'

/**
 * History schama field resolvers
 */
const resolvers = {
  History: {
    id: (node: ChangeLogType) => node._id.toString(),

    editedBy: (node: ChangeLogType) => node.editedBy.toUUID().toString(),

    editedByUser: async (node: ChangeLogType, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      const u = await users.getUsername(node.editedBy)
      return u?.username ?? null
    }
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

    createdByUser: async (node: AuthorMetadata, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      if (node?.createdBy == null) return null
      const u = await users.getUsername(node.createdBy)
      return u?.username ?? null
    },

    updatedByUser: async (node: AuthorMetadata, _: any, { dataSources }) => {
      const { users } = dataSources as DataSourcesType
      if (node?.updatedBy == null) return null
      const u = await users.getUsername(node.updatedBy)
      return u?.username ?? null
    }
  }
}

export default resolvers
