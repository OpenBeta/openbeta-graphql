import { shield, allow, and, or } from 'graphql-shield'
import { isEditor, isUserAdmin, isOwner, isValidEmail, isMediaOwner } from './rules.js'

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
    updateUserProfile: and(isOwner, isValidEmail),
    addEntityTag: or(isMediaOwner, isUserAdmin),
    removeEntityTag: or(isMediaOwner, isUserAdmin),
    addMediaObjects: or(isOwner),
    deleteMediaObject: or(isMediaOwner, isUserAdmin)
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow
})

export default permissions
