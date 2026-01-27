/*
* This file is a mod of src/auth/permissions.ts and is used when starting the server via `yarn serve-dev`
* It bypasses the authorization for local development and allows all queries and mutations
*/
import { shield, allow } from 'graphql-shield'

const localDevBypassAuthPermissions = shield({
  Query: {
    '*': allow
  },
  Mutation: {
    '*': allow
  }
}, {
  allowExternalErrors: true,
  fallbackRule: allow
})

export default localDevBypassAuthPermissions
