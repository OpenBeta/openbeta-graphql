import muid from 'uuid-mongodb'

import {
  GetHistoryInputFilterType,
  GetAreaHistoryInputFilterType,
  GetOrganizationHistoryInputFilterType
} from '../../db/ChangeLogType'
import { Context } from '../../types'

const HistoryQueries = {
  getChangeHistory: async (_, { filter }, { dataSources }: Context): Promise<any> => {
    const { history } = dataSources
    const { uuidList }: GetHistoryInputFilterType = filter ?? {}
    // Note: userUuid, fromDate, toDate filters don't currently work.
    // Note: though we pull uuidList, we don't use it either.

    // Convert array of uuid in string to UUID[]
    const muidList = uuidList?.map(entry => muid.from(entry)) ?? []
    return await history.getChangeSets(muidList)
  },

  getAreaHistory: async (_, { filter }, { dataSources }: Context): Promise<any> => {
    const { history } = dataSources
    const { areaId }: GetAreaHistoryInputFilterType = filter ?? {}
    const id = muid.from(areaId)
    return await history.getAreaChangeSets(id)
  },

  getOrganizationHistory: async (_, { filter }, { dataSources }: Context): Promise<any> => {
    const { history } = dataSources
    const { orgId }: GetOrganizationHistoryInputFilterType = filter ?? {}
    return await history.getOrganizationChangeSets(orgId)
  }
}

export default HistoryQueries
