import { OrganizationType } from '../../db/OrganizationTypes.js'
import { ContextWithAuth } from '../../types.js'

const OrganizationMutations = {

  addOrganization: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<OrganizationType | null> => {
    const { organizations } = dataSources

    // permission middleware shouldn't send undefined uuid
    if (user?.uuid == null) throw new Error('Missing user uuid')
    if (input?.orgType == null) throw new Error('Missing orgType')
    if (input?.displayName == null) throw new Error('Missing displayName')

    return await organizations.addOrganization(user.uuid, input.orgType, input)
  },

  updateOrganization: async (_, { input }, { dataSources, user }: ContextWithAuth): Promise<OrganizationType | null> => {
    const { organizations } = dataSources

    if (user?.uuid == null) throw new Error('Missing user uuid')
    if (input?.orgId == null) throw new Error('Missing organization orgId')

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
