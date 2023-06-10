import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import MutableMediaDataSource from '../MutableMediaDataSource'
import AreaDataSource from '../MutableAreaDataSource'
import ClimbDataSource from '../MutableClimbDataSource'

import { connectDB, createIndexes } from '../../db/index.js'
import { AddEntityInput } from '../../db/MediaTypes.js'
import { AreaType } from '../../db/AreaTypes.js'
import { ClimbType } from '../../db/ClimbTypes'
import { MediaObject, MediaObjectGQLInput } from '../../db/MediaObjectTypes'
import { newSportClimb1 } from './MutableClimbDataSource'

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
  let areaForTagging: AreaType | null
  let climbIdForTagging: string
  let areaTag1: AddEntityInput
  let areaTag2: AddEntityInput
  let badClimbTag: AddEntityInput
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
    areaForTagging = await areas.addArea(muuid.v4(), 'Yosemite NP', null, 'USA')
    if (areaForTagging == null) fail('Fail to pre-seed test areas')

    const rs = await climbs.addOrUpdateClimbs(muuid.v4(), areaForTagging.metadata.area_id, [newSportClimb1])
    if (rs == null) fail('Fail to pre-seed test climbs')
    climbIdForTagging = rs[0]

    // @ts-expect-error
    testMediaObject = await media.addMedia(TEST_MEDIA)
    if (testMediaObject == null) {
      fail('Fail to create test media')
    }

    areaTag1 = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: areaForTagging.metadata.area_id
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

  // it('should set & remove an area tag', async () => {
  //   if (areaForTagging == null) fail('Pre-seeded test area not found')

  //   // add 1st tag
  //   await media.addEntityTag(areaTag1)

  //   // add 2nd tag
  //   const tag: TagEntryResultType | null = await media.addEntityTag(areaTag2)

  //   if (tag == null) fail('Tag shouldn\'t be null')

  //   expect(tag).toMatchObject({
  //     mediaType: areaTag2.mediaType,
  //     mediaUrl: areaTag2.mediaUrl,
  //     area: expect.objectContaining({
  //       area_name: areaForTagging.area_name
  //     })
  //   })

  //   expect(tag.mediaUuid.toUUID().toString()).toEqual(areaTag2.mediaUuid.toUUID().toString())

  //   // remove tag
  //   const res = await media.removeEntityTag(tag._id.toString())
  //   expect(res.id).toEqual(tag._id.toString())
  //   expect(res.mediaUuid).toEqual(tag.mediaUuid.toUUID().toString())
  // })

  it('should handle delete tag error gracefully', async () => {
    // Calling with invalid id format
    await expect(media.removeEntityTag({
      mediaId: 'a9879d30-79ae-414a-a1f0-95fd6f523b4d',
      tagId: 'abc' // bad ObjectId format
    })).rejects.toThrowError(/Argument passed in must be a string of 12/)
  })

  it('should not add a duplicate area tag', async () => {
    const tag1 = await media.addEntityTag(areaTag1)
    expect(tag1?.targetId).toEqual(areaTag1.entityUuid)

    // Insert the same tag again
    const tag1a = await media.addEntityTag(areaTag1)
    expect(tag1a).toBeNull()
  })

  // it.skip('should return recent tags', async () => {
  //   if (areaForTagging == null) fail('Pre-seeded test area not found')

  //   let tags = await media.getMediaByUsers({})
  //   expect(tags).toHaveLength(0)

  //   await media.addEntityTag(areaTag1)
  //   tags = await media.getMediaByUsers({})

  //   expect(tags).toHaveLength(1)
  //   expect(tags[0].mediaWithTags).toHaveLength(1)

  //   expect(tags[0].mediaWithTags[0]).toMatchObject({
  //     mediaType: areaTag1.mediaType,
  //     mediaUrl: areaTag1.mediaUrl
  //   })

  //   // @ts-expect-error
  //   expect(tags[0].mediaWithTags[0].mediaUuid.toUUID().toString()).toEqual(areaTag1.mediaUuid.toUUID().toString())
  // })
})
