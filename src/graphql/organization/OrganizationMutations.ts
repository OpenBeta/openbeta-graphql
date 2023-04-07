import muuid from 'uuid-mongodb'

import { OrganizationType } from '../../db/OrganizationTypes.js'
import { ContextWithAuth } from '../../types.js'

const OrganizationMutations = {

  addOrganization: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<OrganizationType | null> => {
    const { organizations } = dataSources
    const { displayName, orgType } = input

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')

    return await organizations.addOrganization(user.uuid, displayName, orgType)
  },

  updateOrganization: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<OrganizationType | null> => {
    const { organizations } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')
    if (input?.orgId == null) throw new Error('Missing organization orgId')

    // Could these be null?
    input['associatedAreaIds'] = input['associatedAreaIds'].map((aaid: string) => muuid.from(aaid))
    input['excludedAreaIds'] = input['associatedAreaIds'].map((aaid: string) => muuid.from(aaid))

    // Except for 'orgId' other fields are optional, check to see if there are any fields
    // besides 'orgId'
    const fields = Object.keys(input).filter(key => key !== 'orgId')
    if (fields.length === 0) return null

    return await organizations.updateOrganization(
      user.uuid,
      input.orgId,
      input
    )
  }
}

export default OrganizationMutations
