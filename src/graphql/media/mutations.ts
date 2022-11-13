import muid from 'uuid-mongodb'

import { MediaType } from '../../db/MediaTypes.js'
import { DataSourcesType } from '../../types.js'

import { getMediaModel } from '../../db/index.js'

const MediaMutations = {
  setTag: async (_: any, { input }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.setTag(input as MediaType)
  },

  removeTag: async (_, { mediaUuid, destinationId }) => {
    const rs = await getMediaModel().deleteOne({ mediaUuid: muid.from(mediaUuid), destinationId: muid.from(destinationId) })
    if (rs?.deletedCount === 1) return { mediaUuid, destinationId, removed: true }
    return { mediaUuid, destinationId, removed: false }
  }
}

export default MediaMutations
