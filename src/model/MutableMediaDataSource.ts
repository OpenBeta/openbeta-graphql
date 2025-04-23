import { ApolloServerErrorCode } from '@apollo/server/errors'
import { GraphQLError } from 'graphql'
import mongoose, { Document, MergeType } from 'mongoose'
import muuid from 'uuid-mongodb'

import MediaDataSource from './MediaDataSource.js'
import { EntityTag, EntityTagDeleteInput, MediaObject, MediaObjectGQLInput, AddTagEntityInput, NewMediaObjectDoc } from '../db/MediaObjectTypes.js'
import MutableAreaDataSource from './MutableAreaDataSource.js'
import { safeFilename } from '../google-cloud/bucket.js'
import { GoogleStorage } from '../google-cloud/adapter-interface.js'
import { LocalFileStorage } from '../google-cloud/mock-storage-bucket.js'
import { GCS_ENABLE_SERVICES } from '../google-cloud/index.js'

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
          throw new GraphQLError(`Climb with id: ${entityUuid.toUUID().toString()} not found`, {
            extensions: {
              code: ApolloServerErrorCode.BAD_USER_INPUT
            }
          })
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
          throw new GraphQLError(`Area with id: ${entityUuid.toUUID().toString()} not found`, {
            extensions: {
              code: ApolloServerErrorCode.BAD_USER_INPUT
            }
          })
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

      default: throw new GraphQLError(`Entity type ${entityType} not supported.`, {
        extensions: {
          code: ApolloServerErrorCode.BAD_USER_INPUT
        }
      })
    }
    return newEntityTagDoc
  }

  /**
   * Add a new entity tag to a media object.  `mediaId`, `entityUuid`, `entityType`
   * together uniquely identify the entity tag.  Providing the same 3 IDs with a
   * different `topoData` to update the existing entity tag.
   * @returns the new EntityTag or the one being updated.
   */
  async upsertEntityTag ({ mediaId, entityUuid, entityType, topoData }: AddTagEntityInput): Promise<EntityTag> {
    // Find the entity we want to tag
    const newEntityTagDoc = await this.getEntityDoc({ entityUuid, entityType })
    newEntityTagDoc.topoData = topoData

    // Use `bulkWrite` because we can't upsert an array element in a document.
    // See https://www.mongodb.com/community/forums/t/how-to-update-nested-array-using-arrayfilters-but-if-it-doesnt-find-a-match-it-should-insert-new-values/245505
    const bulkOperations: any [] = [{
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(mediaId)
        },
        update: {
          $pull: {
            entityTags: { targetId: entityUuid }
          }
        }
      }
    }, {
      // We treat 'entityTags' like a Set - can't add a new tag the same climb/area id twice.
      // See https://stackoverflow.com/questions/33576223/using-mongoose-mongodb-addtoset-functionality-on-array-of-objects
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(mediaId),
          'entityTags.targetId': { $ne: entityUuid }
        },
        update: {
          $push: {
            entityTags: newEntityTagDoc
          }
        }
      }
    }]

    await this.mediaObjectModel.bulkWrite(bulkOperations, { ordered: true })

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
      .orFail(new GraphQLError('Tag not found', {
        extensions: {
          code: ApolloServerErrorCode.BAD_USER_INPUT
        }
      }))
      .lean()

    return rs.modifiedCount === 1
  }

  /**
   * Add one or more media objects. The embedded entityTag may have one tag.
   *
   * Adding media has two possible paths:
   *
   * 1. In the event that the media already exists, we are simply creating a
   * reference to it in the media collection so that we can ascociate tags with
   * the media without losing relational integrity. This case is very simple,
   * since we only need to fulfil a database request.
   *
   * 2. In th event that a user is trying to add media for which an object in the
   * storage bucket is PENDING, we need to create the signed url for this user to
   * upload the media and fulfil the pending media.
   *
   * In this case, the reference that we create in the database is a future that is
   * awaiting fulfilment by the user. When the user uploads the media that they have
   * promised to us, the storage bucket will create an event for us to consume and we
   * will fulfill the media promise. In the event that the user does NOT fulfil their
   * promise, the document will expire and be cleaned out of the database.
   */
  async addMediaObjects (input: MediaObjectGQLInput[]): Promise<Array<MediaObject & { uploadTo?: string }>> {
    const pendingUrls: Record<string, string> = {}

    const documents: NewMediaObjectDoc[] = await Promise.all(input.map(async entry => {
      let { mediaUrl, width, height, format, size, entityTag, filename, userUuid, maskFilename } = entry
      let expiresAt: Date | undefined

      if (mediaUrl === undefined) {
        if (filename === undefined && maskFilename === false) {
          throw new GraphQLError('Likely programming error: You cannot specify no mask and not pass a filename', {
            extensions: {
              code: ApolloServerErrorCode.BAD_USER_INPUT
            }
          })
        }

        if (filename === undefined) {
          filename = safeFilename(`any.${format}`)
        }

        // Use the supplied filename if the user has suppressed masking, otherwise use a safe filename
        // drop-in replacement.
        const path = `/u/${userUuid}/${maskFilename === false ? filename : safeFilename(filename)}`
        // Signed urls can be made with multiple references to the same promised filename,
        // so it is first-past-the post in terms of which file becomes the one to claim it.
        // we needn't record past signed urls as they resolve to the same mediaUrl - so whem
        // duplicate pending media requests come in, we can push back the expiry and move on
        // - supplying a new url to the requesting user.
        const signed = await this.bucket.signedUrl(path)

        mediaUrl = path
        pendingUrls[mediaUrl] = signed.url
        expiresAt = new Date(signed.expires)
      }

      let newTag: EntityTag | undefined
      if (entityTag != null) {
        newTag = await this.getEntityDoc({
          entityType: entityTag.entityType,
          entityUuid: muuid.from(entityTag.entityId)
        })
      }

      return ({
        size,
        width,
        height,
        format,
        mediaUrl,
        expiresAt,
        userUuid: muuid.from(userUuid),
        ...newTag != null && { entityTags: [newTag] }
      })
    }))

    // look-ahead for duplicates (pending duplicates, since reified media should throw the normal complaints)
    const duplicates = await this.mediaObjectModel.find(
      {
        mediaUrl: { $in: documents.map(i => i.mediaUrl) },
        // Pending media are the only media for which no key error
        // should be a possibility. So we specify that the document must contain
        // an upcoming expiry time.
        expiresAt: { $exists: true }
      },
      { expiresAt: true, mediaUrl: true }
    )

    let extant: Array<MergeType<Document<unknown, {}, MediaObject> & MediaObject & Required<{
      _id: mongoose.Types.ObjectId
    }>, Omit<NewMediaObjectDoc, '_id'>>> = []

    if (duplicates.length > 0) {
      const extantFilter = {
        _id: { $in: duplicates.map(i => i._id) },
        expiresAt: { $exists: true }
      }

      // Push back the document expiry time.
      await this.mediaObjectModel.updateMany(
        extantFilter,
        // It should be the case that all <PENDING> documents will
        // share a near-identical future expiry date (accurate down to milliseconds), so we can just
        // use the same for all of them since we don't expect many close-calls in the timing department.
        { expiresAt: duplicates[0].expiresAt }
      )

      // We can re-use the above filter to now grab the objects that we need, rather than creating them.
      extant = await this.mediaObjectModel.find(extantFilter)
    }

    const extantFilter = new Set(extant.map(i => i.mediaUrl))

    // Do not set `lean = true` as it will not return 'createdAt'
    let rs = await this.mediaObjectModel.insertMany(documents.filter(i => !extantFilter.has(i.mediaUrl)))
    if (rs === null) (rs = [])

    return ([...rs, ...extant]).map(i => ({ ...i.toObject(), uploadTo: pendingUrls[i.mediaUrl] }))
  }

  /**
   * Delete one media object.
   */
  async deleteMediaObject (mediaId: mongoose.Types.ObjectId): Promise<boolean> {
    const filter = { _id: mediaId }
    const rs = await this.mediaObjectModel.find(filter).orFail(new GraphQLError(`Media Id not found ${mediaId.toString()}`, {
      extensions: {
        code: ApolloServerErrorCode.BAD_USER_INPUT
      }
    }))

    if ((rs[0].entityTags?.length ?? 0) > 0) {
      throw new GraphQLError('Cannot delete media object with non-empty tags. Delete tags first.', {
        extensions: {
          code: ApolloServerErrorCode.BAD_USER_INPUT
        }
      })
    }

    const rs2 = await this.mediaObjectModel.deleteMany(filter)
    return rs2.deletedCount === 1
  }

  static instance: MutableMediaDataSource

  static getInstance (): MutableMediaDataSource {
    if (MutableMediaDataSource.instance == null) {
      MutableMediaDataSource.instance = new MutableMediaDataSource({
        modelOrCollection: mongoose.connection.db.collection('media'),
        bucket: GCS_ENABLE_SERVICES ? new GoogleStorage() : new LocalFileStorage()
      })
    }
    return MutableMediaDataSource.instance
  }
}
