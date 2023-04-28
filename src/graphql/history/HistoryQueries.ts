import muid from 'uuid-mongodb'

import {
  GetHistoryInputFilterType,
  GetAreaHistoryInputFilterType,
  GetOrganizationHistoryInputFilterType
} from '../../db/ChangeLogType.js'
import { DataSourcesType } from '../../types.js'

const HistoryQueries = {
  getChangeHistory: async (_, { filter }, { dataSources }): Promise<any> => {
    const { history }: DataSourcesType = dataSources
    const { uuidList }: GetHistoryInputFilterType = filter ?? {}

    // convert array of uuid in string to UUID[]
    const muidList = uuidList?.map(entry => muid.from(entry)) ?? []
    return await history.getChangeSets(muidList)
  },

  getAreaHistory: async (_, { filter }, { dataSources }): Promise<any> => {
    const { history }: DataSourcesType = dataSources
    const { areaId }: GetAreaHistoryInputFilterType = filter ?? {}
    const id = muid.from(areaId)
    return await history.getAreaChangeSets(id)
  },

  getOrganizationHistory: async (_, { filter }, { dataSources }): Promise<any> => {
    const { history }: DataSourcesType = dataSources
    const { orgId }: GetOrganizationHistoryInputFilterType = filter ?? {}
    return await history.getOrganizationChangeSets(orgId)
  }
}

export default HistoryQueries
