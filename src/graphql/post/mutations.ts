import muid from 'uuid-mongodb'
import { UserInputError } from 'apollo-server'

// import { MediaType, RefModelType } from '../../db/MediaTypes.js'
import { getPostModel, getClimbModel } from '../../db/index.js'
import { PostType, PostInputType, PostMedia } from '../../db/PostTypes.js'

const isValidClimb = async (media: PostMedia): Promise<Boolean> => {
  if (media.destinationIds != null) {
    for (const destinationId of media.destinationIds) {
      const climb = await getClimbModel().exists({
        _id: muid.from(destinationId)
      })

      if (climb == null) {
        throw new UserInputError(
          `Climb with id: ${destinationId.toString()} doesn't exist`
        )
      }
    }
  }
  return true
}

const PostMutations = {
  createPost: async (_, { input }) => {
    const { media, createdAt, description, userId }: PostInputType = input

    // initially updatedAt is same as creation time
    const updatedAt = createdAt

    // 1) Ensure each photo's destination exists
    // 2) Ensure userId exists
    // 3) add to DB

    const doc: PostType = {
      media,
      description,
      createdAt,
      updatedAt,
      userId
    }
    // console.log('new doc', doc)

    const PostModel = getPostModel()

    try {
      // Check whether the climb referenced this tag exists before we allow
      // the tag to be added

      for (const item of media) {
        await isValidClimb(item)
      }

      const res = await PostModel.create({ ...doc }, function (err) {
        if (err !== null) {
          console.error(err)
        } else {
          console.log('SAVED NEW POST')
        }
        // saved!
      })
      console.log('res', res)
      return res
    } catch (e) {
      if (e.code === 11000) {
        throw new UserInputError('Duplicated mediaUuid and destinationId')
      }
      throw e
    }
  }

  // removeTag: async (_, { mediaUuid, destinationId }) => {
  //   const rs = await getMediaModel().deleteOne({
  //     mediaUuid: muid.from(mediaUuid),
  //     destinationId: muid.from(destinationId)
  //   })
  //   if (rs?.deletedCount === 1)
  //     return { mediaUuid, destinationId, removed: true }
  //   return { mediaUuid, destinationId, removed: false }
  // }
}

export default PostMutations
