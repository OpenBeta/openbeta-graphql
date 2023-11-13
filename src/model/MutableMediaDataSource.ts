import { UserInputError } from 'apollo-server'
import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MediaDataSource from './MediaDataSource'
import { EntityTag, EntityTagDeleteInput, MediaObject, MediaObjectGQLInput, AddTagEntityInput, NewMediaObjectDoc } from '../db/MediaObjectTypes'
import MutableAreaDataSource from './MutableAreaDataSource'

export default class MutableMediaDataSource extends MediaDataSource {
  areaDS = MutableAreaDataSource.getInstance()

  async getEntityDoc ({ entityUuid, entityType }: Omit<AddTagEntityInput, 'mediaId'>): Promise<EntityTag> {
    let newEntityTagDoc: EntityTag
    switch (entityType) {
      case 0: {
        // Check whether the climb referencing this tag exists before we allow
        // the tag to be added
        const climb = await this.areaDS.findOneClimbByUUID(entityUuid)

        if (climb == null) {
          throw new UserInputError(`Climb with id: ${entityUuid.toUUID().toString()} not found`)
        }

        newEntityTagDoc = {
          _id: new mongoose.Types.ObjectId(),
          targetId: entityUuid,
          type: entityType,
          ancestors: climb.parent.ancestors,
          climbName: climb.name,
          areaName: climb.parent.area_name,
          lnglat: climb.metadata.lnglat
        }

        break
      }

      case 1: {
        // Check whether the area referencing this tag exists before we allow
        // the tag to be added
        const area = await this.areaDS.findOneAreaByUUID(entityUuid)

        if (area == null) {
          throw new UserInputError(`Area with id: ${entityUuid.toUUID().toString()} not found`)
        }

        newEntityTagDoc = {
          _id: new mongoose.Types.ObjectId(),
          targetId: entityUuid,
          type: entityType,
          ancestors: area.ancestors,
          areaName: area.area_name,
          lnglat: area.metadata.lnglat
        }

        break
      }

      default: throw new UserInputError(`Entity type ${entityType} not supported.`)
    }
    return newEntityTagDoc
  }

  /**
   * Add a new entity tag (a climb or area) to a media object.
   * @returns new EntityTag . 'null' if the entity already exists.
   */
  async addEntityTag ({ mediaId, entityUuid, entityType }: AddTagEntityInput): Promise<EntityTag> {
    // Find the entity we want to tag
    const newEntityTagDoc = await this.getEntityDoc({ entityUuid, entityType })

    // We treat 'entityTags' like a Set - can't tag the same climb/area id twice.
    // See https://stackoverflow.com/questions/33576223/using-mongoose-mongodb-addtoset-functionality-on-array-of-objects
    const filter = {
      _id: new mongoose.Types.ObjectId(mediaId),
      'entityTags.targetId': { $ne: entityUuid }
    }

    await this.mediaObjectModel
      .updateOne(
        filter,
        {
          $push: {
            entityTags: newEntityTagDoc
          }
        })
      .orFail(new UserInputError('Media not found or tag already exists.'))
      .lean()

    return newEntityTagDoc
  }

  /**
   *  Remove a climb/area entity tag
   */
  async removeEntityTag ({ mediaId, tagId }: EntityTagDeleteInput): Promise<boolean> {
    const rs = await this.mediaObjectModel
      .updateOne<MediaObject>(
      {
        _id: mediaId,
        'entityTags._id': tagId
      },
      {
        $pull: {
          entityTags: { _id: tagId }
        }
      },
      { multi: true })
      .orFail(new UserInputError('Tag not found'))
      .lean()

    return rs.modifiedCount === 1
  }

  /**
   * Add one or more media objects.  The embedded entityTag may have one tag.
   */
  async addMediaObjects (input: MediaObjectGQLInput[]): Promise<MediaObject[]> {
    const docs: NewMediaObjectDoc[] = await Promise.all(input.map(async entry => {
      const { userUuid: userUuidStr, mediaUrl, width, height, format, size, entityTag } = entry
      let newTag: EntityTag | undefined
      if (entityTag != null) {
        newTag = await this.getEntityDoc({
          entityType: entityTag.entityType,
          entityUuid: muuid.from(entityTag.entityId)
        })
      }

      return ({
        mediaUrl,
        width,
        height,
        format,
        size,
        userUuid: muuid.from(userUuidStr),
        ...newTag != null && { entityTags: [newTag] }
      })
    }))

    const rs = await this.mediaObjectModel.insertMany(docs, { lean: true })
    return rs != null ? rs : []
  }

  /**
   * Delete one media object.
   */
  async deleteMediaObject (mediaId: mongoose.Types.ObjectId): Promise<boolean> {
    const filter = { _id: mediaId }
    const rs = await this.mediaObjectModel.find(filter).orFail(new UserInputError(`Media Id not found ${mediaId.toString()}`))

    if ((rs[0].entityTags?.length ?? 0) > 0) {
      throw new UserInputError('Cannot delete media object with non-empty tags. Delete tags first.')
    }

    const rs2 = await this.mediaObjectModel.deleteMany(filter)
    return rs2.deletedCount === 1
  }

  static instance: MutableMediaDataSource

  static getInstance (): MutableMediaDataSource {
    if (MutableMediaDataSource.instance == null) {
      MutableMediaDataSource.instance = new MutableMediaDataSource(mongoose.connection.db.collection('media'))
    }
    return MutableMediaDataSource.instance
  }
}
