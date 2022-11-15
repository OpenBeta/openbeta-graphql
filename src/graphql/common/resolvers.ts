import dateScalar from './DateScalar.js'
import MuidScalar from './MuidScalar.js'

const resolvers = {
  Date: dateScalar,
  MUID: MuidScalar
}

export default resolvers
