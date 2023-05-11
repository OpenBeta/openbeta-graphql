import { XMediaType, RemoveXMediaInputType } from '../../db/XMediaTypes'
import { getXMediaModel } from '../../db/XMediaSchema.js'
import { Context } from '../../types'

const XMediaMutations = {
  // addXMedia
  addXMedia: async (
    _: any,
    { input }: { input: XMediaType },
    { dataSources }: Context
  ) => {
    const { xmedia } = dataSources

    try {
      const newXMedia = await xmedia.addXMedia({
        userId: input.userId,
        mediaType: input.mediaType,
        mediaUrl: input.mediaUrl
      })
      if (newXMedia == null) {
        console.error(`Failed to add xMedia with url: ${input.mediaUrl}`)
      }
      return { xMediaId: newXMedia }
    } catch (ex) {
      console.error('Error adding new Post', ex)
      return ex
    }
  },

  // removeXMedia
  removeXMedia: async (_: any, { input }: { input: RemoveXMediaInputType }) => {
    const XMediaModel = getXMediaModel()
    const res = await XMediaModel.deleteOne({ _id: input.xMediaId })
    return { numDeleted: res.deletedCount }
  }
}

export default XMediaMutations
