import muid from 'uuid-mongodb'
import mongoose from 'mongoose'
import { Context } from '../../types.js'
import { EntityTag, EntityTagDeleteGQLInput, AddEntityTagGQLInput, MediaObject, MediaObjectGQLInput, DeleteMediaGQLInput } from '../../db/MediaObjectTypes.js'

const MediaMutations = {
  addMediaObjects: async (_: any, args, { dataSources }: Context): Promise<MediaObject[]> => {
    const { media } = dataSources
    const { input }: { input: MediaObjectGQLInput[] } = args
    return await media.addMediaObjects(input)
  },

  deleteMediaObject: async (_: any, args, { dataSources }: Context): Promise<boolean> => {
    const { media } = dataSources
    const { input }: { input: DeleteMediaGQLInput } = args
    return await media.deleteMediaObject(new mongoose.Types.ObjectId(input.mediaId))
  },

  addEntityTag: async (_: any, args, { dataSources }: Context): Promise<EntityTag> => {
    const { media } = dataSources
    const { input }: { input: AddEntityTagGQLInput } = args
    const { mediaId, entityId, entityType } = input
    return await media.addEntityTag({
      mediaId: new mongoose.Types.ObjectId(mediaId),
      entityUuid: muid.from(entityId),
      entityType
    })
  },

  removeEntityTag: async (_: any, args, { dataSources }: Context): Promise<boolean> => {
    const { media } = dataSources
    const { input }: { input: EntityTagDeleteGQLInput } = args
    const { mediaId, tagId } = input
    return await media.removeEntityTag({
      mediaId: new mongoose.Types.ObjectId(mediaId),
      tagId: new mongoose.Types.ObjectId(tagId)
    })
  }
}

export default MediaMutations
