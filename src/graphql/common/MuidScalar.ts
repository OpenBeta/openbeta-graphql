import { GraphQLScalarType, Kind } from 'graphql'
import muid, { MUUID } from 'uuid-mongodb'

const fromString = (s: string): MUUID => muid.from(s)

// See https://www.apollographql.com/docs/apollo-server/schema/custom-scalars/

const MuidScalar = new GraphQLScalarType({
  name: 'MUID',
  description: 'Mongo uuid custom scalar type',

  // Convert outgoing Muid to string for JSON
  serialize (value: MUUID): string {
    return value.toUUID().toString()
  },

  // Convert incoming uuid (Ex. df00a273-5215-4bf9-a5d5-9793428b8650) to MUUID
  parseValue (value: string): MUUID {
    return fromString(value)
  },

  parseLiteral (ast) {
    if (ast.kind === Kind.STRING) {
      return fromString(ast.value)
    }
    return null // Invalid hard-coded value (not a string)
  }
})

export default MuidScalar
