import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import type { FindCursor, WithId } from 'mongodb'
import muuid from 'uuid-mongodb'

import { getOrganizationModel } from '../db/index.js'
import { AssociatedAreaIdsFilterParams, DisplayNameFilterParams, OrganizationGQLFilter } from '../types'
import { OrganizationType } from '../db/OrganizationTypes.js'

export default class OrganizationDataSource extends MongoDataSource<OrganizationType> {
  organizationModel = getOrganizationModel()

  async findOrganizationsByFilter (filters?: OrganizationGQLFilter): Promise<FindCursor<WithId<OrganizationType>>> {
    let mongoFilter: any = {}
    if (filters !== undefined) {
      mongoFilter = Object.entries(filters).reduce<Filter<OrganizationType>>((acc, [key, filter]): Filter<OrganizationType> => {
        switch (key) {
          case 'displayName': {
            const displayNameFilter = (filter as DisplayNameFilterParams)
            const param = displayNameFilter.exactMatch !== true ? new RegExp(displayNameFilter.match, 'ig') : displayNameFilter.match
            acc.displayName = param
            break
          }
          case 'associatedAreaIds': {
            const associatedAreaIdFilter = (filter as AssociatedAreaIdsFilterParams)
            acc.associatedAreaIds = { $in: associatedAreaIdFilter.includes.map(area_id => muuid.from(area_id)) }
          }
          default:
            break
        }
        return acc
      }, {})
    }

    mongoFilter._deleting = { $eq: null } // marked for deletion
    return this.collection.find(mongoFilter)
  }

  async findOneOrganizationByOrgId (orgId: muuid.MUUID): Promise<OrganizationType> {
    const rs = await this.organizationModel
      .aggregate([
        { $match: { orgId, _deleting: { $exists: false } } }
      ])

    if (rs != null && rs.length === 1) {
      return rs[0]
    }
    throw new Error(`Organization ${orgId.toUUID().toString()} not found.`)
  }
}
