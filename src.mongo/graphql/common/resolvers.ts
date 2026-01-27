import dateScalar from './DateScalar.js'
import MuuidScalar from './MuuidScalar.js'

const resolvers = {
  Date: dateScalar,
  MUUID: MuuidScalar
}

export default resolvers
