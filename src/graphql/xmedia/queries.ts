import { getXMediaModel } from '../../db/XMediaSchema'
import { GetXMediaInputType } from '../../db/XMediaTypes'

const XMediaQueries = {
  // Given a list of xMediaIds, return a list of xMedia documents.
  getXMedia: async (_, { input }: { input: GetXMediaInputType }) => {
    const xMediaModel = getXMediaModel()
    const xMedia = await xMediaModel.find({ _id: { $in: input.xMediaIds } }).lean()
    return { xMedia }
  }
}

export default XMediaQueries
