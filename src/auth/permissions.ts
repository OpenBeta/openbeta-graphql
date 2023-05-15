import { shield, allow } from 'graphql-shield'
import { isEditor, isUserAdmin } from './rules.js'

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
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow
})

export default permissions
