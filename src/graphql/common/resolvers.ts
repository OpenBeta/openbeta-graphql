import dateScalar from './DateScalar'
import MuuidScalar from './MuuidScalar'

const resolvers = {
  Date: dateScalar,
  MUUID: MuuidScalar
}

export default resolvers
