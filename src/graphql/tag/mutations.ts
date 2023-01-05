import { TagType, RemoveTagInputType } from '../../db/TagTypes'
import { getTagModel } from '../../db/TagSchema.js'

const TagMutations = {
  addTag: async (_: any, { input }: {input: TagType}) => {
    const TagModel = getTagModel()
    const newTag = new TagModel(input)
    const res = await TagModel.create(newTag)
    return { tagId: res.id }
  },

  deleteTag: async (_: any, { input }: {input: RemoveTagInputType}) => {
    const TagModel = getTagModel()
    const res = await TagModel.deleteOne({ _id: input.tagId })
    return { numDeleted: res.deletedCount }
  }
}

export default TagMutations
