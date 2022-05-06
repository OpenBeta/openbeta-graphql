import muid from 'uuid-mongodb'
import { getMediaModel } from '../../db/index.js'

const MediaQueries = {

  getTagsByMediaIdList: async (_, { uuidList }: {uuidList: string[]}) => {
    if (uuidList !== undefined && uuidList.length > 0) {
      const muidList = uuidList.map(entry => muid.from(entry))
      const rs = await getMediaModel()
        .find({ mediaUuid: { $in: muidList } })
        .populate('destinationId').lean()
      return rs
    }
    return []
  }
}

export default MediaQueries
