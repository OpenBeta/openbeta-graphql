import { shield, allow } from 'graphql-shield'
import { isEditor } from './rules.js'

const permissions = shield({
  Query: {
    '*': allow
  },
  Mutation: {
    setDestinationFlag: isEditor,
    removeArea: isEditor,
    addArea: isEditor,
    updateArea: isEditor,
    addClimbs: isEditor,
    updateClimbs: isEditor,
    deleteClimbs: isEditor
  }
},
{
  allowExternalErrors: true,
  fallbackRule: allow
})

export default permissions
