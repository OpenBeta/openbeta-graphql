import muid from 'uuid-mongodb'

import {
  GetHistoryInputFilterType,
  GetAreaHistoryInputFilterType,
  GetOrganizationHistoryInputFilterType
} from '../../db/ChangeLogType.js'
import { GQLContext } from '../../types.js'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

const HistoryQueries = {
  getChangeHistory: async (_, { filter }, { dataSources }: GQLContext): Promise<any> => {
    const { history } = dataSources
    const { uuidList, limit, offset }: GetHistoryInputFilterType = filter ?? {}
    // Note: userUuid, fromDate, toDate filters don't currently work.
    // Note: though we pull uuidList, we don't use it either.

    // Convert array of uuid in string to UUID[]
    const muidList = uuidList?.map(entry => muid.from(entry)) ?? []
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await history.getChangeSets(muidList, safeLimit, safeOffset)
  },

  getAreaHistory: async (_, { filter }, { dataSources }: GQLContext): Promise<any> => {
    const { history } = dataSources
    const { areaId, limit, offset }: GetAreaHistoryInputFilterType = filter ?? {}
    const id = areaId != null ? muid.from(areaId) : undefined
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await history.getAreaChangeSets(id, safeLimit, safeOffset)
  },

  getOrganizationHistory: async (_, { filter }, { dataSources }: GQLContext): Promise<any> => {
    const { history } = dataSources
    const { orgId, limit, offset }: GetOrganizationHistoryInputFilterType = filter ?? {}
    const safeLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT)
    const safeOffset = offset ?? 0
    return await history.getOrganizationChangeSets(orgId, safeLimit, safeOffset)
  }
}

export default HistoryQueries
