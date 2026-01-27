import { GraphQLError } from 'graphql'
import { allow, and, or, shield } from 'graphql-shield'
import { isEditor, isMediaOwner, isOwner, isUserAdmin, isValidEmail } from './rules.js'

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
    updateClimb: isEditor,
    updateClimbs: isEditor,
    deleteClimbs: isEditor,
    bulkImportAreas: isEditor,
    updateUserProfile: and(isOwner, isValidEmail),
    addEntityTag: or(isMediaOwner, isUserAdmin),
    removeEntityTag: or(isMediaOwner, isUserAdmin),
    addMediaObjects: or(isOwner),
    deleteMediaObject: or(isMediaOwner, isUserAdmin)
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow,
  fallbackError: new GraphQLError('Not Authorised!', {
    extensions: {
      code: 'FORBIDDEN',
      http: { status: 401 }
    }
  })
})

export default permissions
