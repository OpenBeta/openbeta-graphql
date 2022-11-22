import muid from 'uuid-mongodb'
import { DataSourcesType } from '../../types.js'

const MediaMutations = {
  setTag: async (_: any, { input }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.setTag({
      ...input,
      mediaUuid: muid.from(input.mediaUuid),
      destinationId: muid.from(input.destinationId)
    })
  },

  removeTag: async (_: any, { tagId }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.removeTag(tagId)
  }
}

export default MediaMutations
