import muid from 'uuid-mongodb'
import { Context } from '../../types.js'

const MediaMutations = {
  setTag: async (_: any, { input }, { dataSources }: Context) => {
    const { media } = dataSources
    return await media.setTag({
      ...input,
      mediaUuid: muid.from(input.mediaUuid),
      destinationId: muid.from(input.destinationId)
    })
  },

  removeTag: async (_: any, { tagId }, { dataSources }: Context) => {
    const { media } = dataSources
    return await media.removeTag(tagId)
  }
}

export default MediaMutations
