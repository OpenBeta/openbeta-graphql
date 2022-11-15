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

  removeTag: async (_: any, { mediaUuid, destinationId }, { dataSources }) => {
    const { media }: DataSourcesType = dataSources
    return await media.removeTag(muid.from(mediaUuid), muid.from(destinationId))
  }
}

export default MediaMutations
