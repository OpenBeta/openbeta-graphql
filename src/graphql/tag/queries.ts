import { getTagModel } from '../../db/TagSchema'
import { GetTagsInputType } from '../../db/TagTypes'

const TagQueries = {
  // Given a list of TagIds, return a list of Tag documents.
  getTags: async (_, { input }: { input: GetTagsInputType }) => {
    const TagModel = getTagModel()
    const tag = await TagModel.find({ _id: { $in: input.tagIds } }).lean()
    return { tag }
  }
}

export default TagQueries
