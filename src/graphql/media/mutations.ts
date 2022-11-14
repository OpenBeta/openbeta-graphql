import { MediaType } from '../../db/MediaTypes.js'
import { DataSourcesType } from '../../types.js'

const MediaMutations = {
  setTag: async (_: any, { input }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.setTag(input as MediaType)
  },

  removeTag: async (_: any, { mediaUuid, destinationId }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.removeTag(mediaUuid, destinationId)
  }
}

export default MediaMutations
