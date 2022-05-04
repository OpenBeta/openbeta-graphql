import muid from 'uuid-mongodb'
import { getMediaModel, getAreaModel } from '../../db/index.js'
import { QueryByIdType } from '../../types.js'
import { IAreaMetadata } from '../../db/AreaTypes.js'
import { ClimbType } from '../../db/ClimbTypes.js'
import { MediaType } from '../../db/MediaTypes.js'

interface TagEntry {
  area_name: string
  metadata: IAreaMetadata
  climbs: ClimbType[]
  media: MediaType[]
}

const MediaQueries = {
  getTagsByMediaId: async (
    _,
    { uuid }: QueryByIdType,
    { dataSources }) => {
    if (uuid !== undefined && uuid !== '') {
      const media = getMediaModel()
      const rs = await media.findOne({ mediaUuid: muid.from(uuid) }).lean()
      return rs
    }
    return null
  },
  /**
   * Get all climbs and areas associated with a list of media IDs
   */
  getTagsByMediaIdList: async (
    _,
    { uuidList }: {uuidList: string[]},
    { dataSources }) => {
    if (uuidList !== undefined && uuidList.length > 0) {
      const muidList = uuidList.map(entry => muid.from(entry))
      // const rs = await getMediaModel().aggregate(
      //   [{ 'mediaUuid': { $in: muidList } }]
      //   )
      // console.log('#rs', rs)
      return []
    }
    return null
  }
}

export default MediaQueries
