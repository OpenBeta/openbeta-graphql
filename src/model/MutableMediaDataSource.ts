import { UserInputError } from 'apollo-server'
import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MediaDataSource from './MediaDataSource.js'
import { EntityTag, EntityTagDeleteInput, MediaObject, MediaObjectGQLInput, AddTagEntityInput } from '../db/MediaObjectTypes.js'
import MutableAreaDataSource from './MutableAreaDataSource.js'

export default class MutableMediaDataSource extends MediaDataSource {
  areaDS = MutableAreaDataSource.getInstance()

  /**
   * Add a new entity tag (a climb or area) to a media object.
   * @returns new EntityTag . 'null' if the entity already exists.
   */
  async addEntityTag ({ mediaId, entityUuid, entityType }: AddTagEntityInput): Promise<EntityTag> {
    switch (entityType) {
      case 0: {
        // Check whether the climb referencing this tag exists before we allow
        // the tag to be added
        const climb = await this.areaDS.findOneClimbByUUID(entityUuid)

        if (climb == null) {
          throw new UserInputError(`Climb with id: ${entityUuid.toUUID().toString()} not found`)
        }

        const doc: EntityTag = {
          _id: new mongoose.Types.ObjectId(),
          targetId: entityUuid,
          type: entityType,
          ancestors: climb.parent.ancestors,
          climbName: climb.name,
          areaName: climb.parent.area_name,
          lnglat: climb.metadata.lnglat
        }

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
                entityTags: doc
              }
            })
          .orFail(new UserInputError('Media not found or tag already exists.'))
          .lean()

        return doc
      }

      case 1: {
        // Check whether the area referencing this tag exists before we allow
        // the tag to be added
        const area = await this.areaDS.findOneAreaByUUID(entityUuid)

        if (area == null) {
          throw new UserInputError(`Area with id: ${entityUuid.toUUID().toString()} not found`)
        }

        const doc: EntityTag = {
          _id: new mongoose.Types.ObjectId(),
          targetId: entityUuid,
          type: entityType,
          ancestors: area.ancestors,
          areaName: area.area_name,
          lnglat: area.metadata.lnglat
        }

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
                entityTags: doc
              }
            })
          .orFail(new UserInputError('Media not found or tag already exists.'))
          .lean()

        return doc
      }

      default: throw new UserInputError(`Entity type ${entityType} not supported.`)
    }
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
   * Add a new media object.
   */
  async addMedia (input: MediaObjectGQLInput): Promise<MediaObject | null> {
    const doc = {
      ...input,
      userUuid: muuid.from(input.userUuid)
    }
    const rs = await this.mediaObjectModel.insertMany([doc], { lean: true })
    return rs != null && rs.length === 1 ? rs[0] : null
  }

  static instance: MutableMediaDataSource

  static getInstance (): MutableMediaDataSource {
    if (MutableMediaDataSource.instance == null) {
      MutableMediaDataSource.instance = new MutableMediaDataSource(mongoose.connection.db.collection('media'))
    }
    return MutableMediaDataSource.instance
  }
}
