import type OrganizationDataSource from '../../model/OrganizationDataSource'
import { QueryByIdType, OrganizationGQLFilter, Sort, Context } from '../../types'

const OrganizationQueries = {
  organization: async (_: any,
    { muuid }: QueryByIdType,
    context: Context, info) => {
    const { dataSources } = context
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    if (muuid !== undefined) {
      return await organizations.findOneOrganizationByOrgId(muuid)
    }
    return null
  },

  organizations: async (
    _,
    { filter, sort, limit = 40 }: { filter?: OrganizationGQLFilter, sort?: Sort, limit?: number },
    { dataSources }: Context
  ) => {
    const { organizations }: { organizations: OrganizationDataSource } = dataSources
    const filtered = await organizations.findOrganizationsByFilter(filter)
    if (sort != null) {
      return await filtered.collation({ locale: 'en' }).sort(sort).limit(limit).toArray()
    } else {
      return await filtered.collation({ locale: 'en' }).limit(limit).toArray()
    }
  }
}

export default OrganizationQueries
