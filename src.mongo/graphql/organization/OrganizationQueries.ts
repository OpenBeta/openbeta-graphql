import type OrganizationDataSource from '../../model/OrganizationDataSource'
import { GQLContext, OrganizationGQLFilter, QueryByIdType, Sort } from '../../types'

const OrganizationQueries = {
  organization: async (_: any,
    { muuid }: QueryByIdType,
    context: GQLContext, info) => {
    const { dataSources } = context
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    if (muuid != null) {
      return await organizations.findOneOrganizationByOrgId(muuid)
    }
    return null
  },

  organizations: async (
    _,
    { filter, sort, limit = 40, offset = 0 }: { filter?: OrganizationGQLFilter, sort?: Sort, limit?: number, offset?: number },
    { dataSources }: GQLContext
  ) => {
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    const MAX_LIMIT = 500
    const safeLimit = Math.min(limit, MAX_LIMIT)
    const filtered = await organizations.findOrganizationsByFilter(filter)
    if (sort != null) {
      return await filtered.collation({ locale: 'en' }).sort(sort).skip(offset).limit(safeLimit).toArray()
    } else {
      return await filtered.skip(offset).limit(safeLimit).toArray()
    }
  }
}

export default OrganizationQueries
