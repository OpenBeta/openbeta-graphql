import { shield, allow, or, and } from 'graphql-shield'
import { isEditor, isUserAdmin, isOwner, isBuilderServiceAccount, isValidEmail } from './rules.js'

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
    updateUserProfile: and(isOwner, isValidEmail)
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow
})

export default permissions
