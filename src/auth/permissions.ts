import { shield, allow, and } from 'graphql-shield'
import { isEditor, isUserAdmin, isOwner, isValidEmail } from './rules.js'

const permissions = shield({
  Query: {
    '*': allow
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
