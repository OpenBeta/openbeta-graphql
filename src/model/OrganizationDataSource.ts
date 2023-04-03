import { MongoDataSource } from 'apollo-datasource-mongodb'
import { Filter } from 'mongodb'
import type { FindCursor, WithId } from 'mongodb'
import muuid from 'uuid-mongodb'

import { getOrganizationModel } from '../db/index.js'
import { OrganizationGQLFilter } from '../types'
import { OrganizationType } from '../db/OrganizationTypes.js'

export default class OrganizationDataSource extends MongoDataSource<OrganizationType> {
  organizationModel = getOrganizationModel()

  async findOrganizationsByFilter (filters?: OrganizationGQLFilter): Promise<FindCursor<WithId<OrganizationType>>> {
    let mongoFilter: any = {}
    if (filters !== undefined) {
      mongoFilter = Object.entries(filters).reduce<Filter<OrganizationType>>((acc, [key, filter]): Filter<OrganizationType> => {
        switch (key) {
          case 'displayName': {
            const displayNameFilter = (filter)
            const param = displayNameFilter.exactMatch !== true ? new RegExp(displayNameFilter.match, 'ig') : displayNameFilter.match
            acc.displayName = param
            break
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

  async findOneOrganizationByUUID (uuid: muuid.MUUID): Promise<OrganizationType> {
    const rs = await this.organizationModel
      .aggregate([
        { $match: { orgId: uuid, _deleting: { $exists: false } } }
      ])

    if (rs != null && rs.length === 1) {
      return rs[0]
    }
    throw new Error(`Area ${uuid.toUUID().toString()} not found.`)
  }
}
