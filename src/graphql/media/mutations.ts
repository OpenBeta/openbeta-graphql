import muid from 'uuid-mongodb'
import mongoose from 'mongoose'
import { Context } from '../../types.js'
import { EntityTag } from '../../db/MediaObjectTypes.js'
import { AddEntityTagGQLInput } from '../../db/MediaTypes.js'

const MediaMutations = {
  addEntityTag: async (_: any, args, { dataSources }: Context): Promise<EntityTag | null> => {
    const { media } = dataSources
    const { input }: { input: AddEntityTagGQLInput } = args
    const { mediaId, entityId, entityType } = input
    return await media.addEntityTag({
      mediaId: new mongoose.Types.ObjectId(mediaId),
      entityUuid: muid.from(entityId),
      entityType
    })
  },

  removeEntityTag: async (_: any, { input }, { dataSources }: Context): Promise<boolean> => {
    const { media } = dataSources
    return await media.removeEntityTag(input)
  }
}

export default MediaMutations
