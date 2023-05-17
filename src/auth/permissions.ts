import { shield, allow, or } from 'graphql-shield'
import { isEditor, isUserAdmin, isOwner, isBuilderServiceAccount } from './rules.js'

const permissions = shield({
  Query: {
    '*': allow,
    getUserProfile: or(isOwner, isBuilderServiceAccount)
  },
  Mutation: {
    addOrganization: isUserAdmin,
    setDestinationFlag: isEditor,
    removeArea: isEditor,
    addArea: isEditor,
    updateArea: isEditor,
    updateClimbs: isEditor,
    deleteClimbs: isEditor,
    updateUserProfile: isOwner
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow
})

export default permissions
