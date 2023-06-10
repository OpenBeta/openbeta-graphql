import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import MutableMediaDataSource from '../MutableMediaDataSource'
import AreaDataSource from '../MutableAreaDataSource'
import ClimbDataSource from '../MutableClimbDataSource'

import { connectDB, createIndexes } from '../../db/index.js'
import { AddEntityInput } from '../../db/MediaTypes.js'
import { AreaType } from '../../db/AreaTypes.js'
import { EntityTag, MediaObject, MediaObjectGQLInput } from '../../db/MediaObjectTypes.js'
import { newSportClimb1 } from './MutableClimbDataSource.js'

const TEST_MEDIA: MediaObjectGQLInput = {
  userUuid: 'a2eb6353-65d1-445f-912c-53c6301404bd',
  mediaUrl: '/u/a2eb6353-65d1-445f-912c-53c6301404bd/photo1.jpg',
  width: 800,
  height: 600,
  format: 'jpeg',
  size: 45000
}

describe('MediaDataSource', () => {
  let media: MutableMediaDataSource
  let areas: AreaDataSource
  let climbs: ClimbDataSource

  let areaForTagging1: AreaType
  let areaForTagging2: AreaType
  let climbIdForTagging: MUUID

  let areaTag1: AddEntityInput
  let areaTag2: AddEntityInput
  let climbTag: AddEntityInput

  let testMediaObject: MediaObject

  beforeAll(async () => {
    await connectDB()

    areas = AreaDataSource.getInstance()
    climbs = ClimbDataSource.getInstance()
    media = MutableMediaDataSource.getInstance()

    try {
      await areas.areaModel.collection.drop()
      await climbs.climbModel.collection.drop()
      await media.mediaObjectModel.collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }

    await createIndexes()

    await areas.addCountry('USA')
    areaForTagging1 = await areas.addArea(muuid.v4(), 'Yosemite NP', null, 'USA')
    areaForTagging2 = await areas.addArea(muuid.v4(), 'Lake Tahoe', null, 'USA')
    if (areaForTagging1 == null || areaForTagging2 == null) fail('Fail to pre-seed test areas')

    const rs = await climbs.addOrUpdateClimbs(muuid.v4(), areaForTagging1.metadata.area_id, [newSportClimb1])
    if (rs == null) fail('Fail to pre-seed test climbs')
    climbIdForTagging = muuid.from(rs[0])

    // @ts-expect-error
    testMediaObject = await media.addMedia(TEST_MEDIA)
    if (testMediaObject == null) {
      fail('Fail to create test media')
    }

    areaTag1 = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: areaForTagging1.metadata.area_id
    }

    areaTag2 = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: areaForTagging2.metadata.area_id
    }

    climbTag = {
      mediaId: testMediaObject._id,
      entityType: 0,
      entityUuid: climbIdForTagging
    }

    // areaTag2 = {

    // }
    // badClimbTag = {
    //   mediaType: 0,
    //   mediaUuid: muuid.v4(),
    //   mediaUrl: `/u/${muuid.v4().toUUID().toString()}/woof.jpg`,
    //   entityId: muuid.v4(), // climb doesn't exist
    //   destType: 0 // 0: climb, 1: area
    // }
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should not tag a nonexistent area', async () => {
    const badAreaTag: AddEntityInput = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: muuid.v4() // some random area
    }
    await expect(media.addEntityTag(badAreaTag)).rejects.toThrow(/area .* not found/i)
  })

  it('should not tag a nonexistent *climb*', async () => {
    const badClimbTag: AddEntityInput = {
      mediaId: testMediaObject._id,
      entityType: 0,
      entityUuid: muuid.v4() // some random climb
    }
    await expect(media.addEntityTag(badClimbTag)).rejects.toThrow(/climb .* not found/i)
  })

  it('should tag & remove an area tag', async () => {
    if (areaForTagging1 == null) fail('Pre-seeded test area not found')

    // verify the number tags before test
    let mediaObjects = await media.getOneUserMedia(TEST_MEDIA.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(0)

    // add 1st tag
    await media.addEntityTag(areaTag1)

    // add 2nd tag
    const tag = await media.addEntityTag(climbTag)

    expect(tag).toMatchObject<Partial<EntityTag>>({
      targetId: climbTag.entityUuid,
      type: climbTag.entityType,
      areaName: areaForTagging1.area_name,
      ancestors: areaForTagging1.ancestors,
      climbName: newSportClimb1.name,
      lnglat: areaForTagging1.metadata.lnglat
    })

    // verify the number tags
    mediaObjects = await media.getOneUserMedia(TEST_MEDIA.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(2)

    // remove tag
    const res = await media.removeEntityTag({ mediaId: climbTag.mediaId, tagId: tag._id })
    expect(res).toBe(true)

    // verify the number tags
    mediaObjects = await media.getOneUserMedia(TEST_MEDIA.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(1)
  })

  it('should handle delete tag errors gracefully', async () => {
    // with invalid id format
    await expect(media.removeEntityTag({
      mediaId: testMediaObject._id,
      // @ts-expect-error
      tagId: 'abc' // bad ObjectId format
    })).rejects.toThrowError(/Cast to ObjectId failed/i)

    // remove a random tag that doesn't exist
    await expect(media.removeEntityTag({
      mediaId: new mongoose.Types.ObjectId(),
      tagId: new mongoose.Types.ObjectId()
    })).rejects.toThrowError(/not found/i)
  })

  it('should not add a duplicate tag', async () => {
    const newTag = await media.addEntityTag(areaTag2)
    expect(newTag.targetId).toEqual(areaTag2.entityUuid)

    // Insert the same tag again
    await expect(media.addEntityTag(areaTag2)).rejects.toThrowError(/tag already exists/i)
  })
})
