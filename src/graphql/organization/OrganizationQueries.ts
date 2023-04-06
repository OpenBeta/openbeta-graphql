import muid from 'uuid-mongodb'
import type OrganizationDataSource from '../../model/OrganizationDataSource'
import { QueryByIdType, OrganizationGQLFilter, Sort } from '../../types'

const OrganizationQueries = {
  organization: async (_: any,
    { uuid }: QueryByIdType,
    context, info) => {
    const { dataSources } = context
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    if (uuid !== undefined && uuid !== '') {
      return await organizations.findOneOrganizationByUUID(muid.from(uuid))
    }
    return null
  },

  organizations: async (
    _,
    { filter, sort }: { filter?: OrganizationGQLFilter, sort?: Sort },
    { dataSources }
  ) => {
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    const filtered = await organizations.findOrganizationsByFilter(filter)
    if (sort != null) {
      return filtered.collation({ locale: 'en' }).sort(sort).toArray()
    } else {
      return filtered.collation({ locale: 'en' }).toArray()
    }
  },
}

export default OrganizationQueries
