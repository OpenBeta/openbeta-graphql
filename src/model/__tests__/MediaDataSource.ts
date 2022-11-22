import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import MutableMediaDataSource from '../MutableMediaDataSource'
import AreaDataSource from '../MutableAreaDataSource'

import { connectDB, createIndexes, getAreaModel, getMediaModel } from '../../db/index.js'
import { MediaInputType, TagEntryResultType } from '../../db/MediaTypes.js'
import { AreaType } from '../../db/AreaTypes.js'

describe('MediaDataSource', () => {
  let media: MutableMediaDataSource
  let areas: AreaDataSource
  let areaForTagging: AreaType | null
  let areaTag1: MediaInputType
  let areaTag2: MediaInputType
  let badClimbTag: MediaInputType

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    media = new MutableMediaDataSource(mongoose.connection.db.collection('media'))
    areas = new AreaDataSource(mongoose.connection.db.collection('areas'))

    await createIndexes()

    await areas.addCountry('USA')
    areaForTagging = await areas.addArea(muuid.v4(), 'Yosemite NP', null, 'USA')

    if (areaForTagging == null) fail('Fail to preseed test areas for tagging')
    areaTag1 = {
      mediaType: 0,
      mediaUuid: muuid.v4(),
      mediaUrl: `/u/${muuid.v4().toUUID().toString()}/boo.jpg`,
      destinationId: areaForTagging?.metadata.area_id,
      destType: 1 // 0: climb, 1: area
    }
    areaTag2 = {
      mediaType: 0,
      mediaUuid: muuid.v4(),
      mediaUrl: `/u/${muuid.v4().toUUID().toString()}/moo.jpg`,
      destinationId: areaForTagging?.metadata.area_id,
      destType: 1 // 0: climb, 1: area
    }
    badClimbTag = {
      mediaType: 0,
      mediaUuid: muuid.v4(),
      mediaUrl: `/u/${muuid.v4().toUUID().toString()}/woof.jpg`,
      destinationId: muuid.v4(), // climb doesn't exist
      destType: 0 // 0: climb, 1: area
    }
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  beforeEach(async () => {
    await getMediaModel().collection.deleteMany({})
  })

  it('should not tag a nonexistent area', async () => {
    const input: MediaInputType = {
      mediaType: 0,
      mediaUuid: muuid.v4(),
      mediaUrl: `/u/${muuid.v4().toUUID().toString()}/boo.jpg`,
      destinationId: muuid.v4(), // random area id - doesn't exist!
      destType: 1 // 0: climb, 1: area
    }
    await expect(media.setTag(input)).rejects.toThrow(/doesn't exist/)
  })

  it('should not tag a nonexistent *climb*', async () => {
    await expect(media.setTag(badClimbTag)).rejects.toThrow(/doesn't exist/)
  })

  it('should set & remove an area tag', async () => {
    if (areaForTagging == null) fail('Pre-seeded test area not found')

    // add 1st tag
    await media.setTag(areaTag1)

    // add 2nd tag
    const tag: TagEntryResultType | null = await media.setTag(areaTag2)

    if (tag == null) fail('Tag shouldn\'t be null')

    expect(tag).toMatchObject({
      mediaType: areaTag2.mediaType,
      mediaUuid: areaTag2.mediaUuid.toUUID(),
      mediaUrl: areaTag2.mediaUrl,
      area: expect.objectContaining({
        area_name: areaForTagging.area_name
      })
    })

    // remove tag
    const res = await media.removeTag(tag._id.toString())
    expect(res.id).toEqual(tag._id.toString())
    expect(res.mediaUuid).toEqual(tag.mediaUuid.toUUID().toString())
  })

  it('should handle delete tag error gracefully', async () => {
    // Calling with invalid id format
    await expect(media.removeTag('123')).rejects.toThrowError(/Argument passed in must be a string of 12/)

    // Calling with non-existing id
    const randomId = new mongoose.Types.ObjectId()
    await expect(media.removeTag(randomId.toString())).rejects.toThrowError(/Tag not found/)
  })

  it('should prevent a duplicate area tag', async () => {
    await media.setTag(areaTag1)

    // Insert the same tag again -> should throw an error
    await expect(media.setTag(areaTag1)).rejects.toThrowError(/Duplicate/)
  })

  it('should return recent tags', async () => {
    if (areaForTagging == null) fail('Pre-seeded test area not found')

    let tags = await media.getRecentTags()
    expect(tags).toHaveLength(0)

    await media.setTag(areaTag1)
    tags = await media.getRecentTags()

    expect(tags).toHaveLength(1)
    expect(tags[0].tagList).toHaveLength(1)

    console.log('#Tag', tags[0].tagList[0])

    expect(tags[0].tagList[0]).toMatchObject({
      mediaType: areaTag1.mediaType,
      mediaUuid: areaTag1.mediaUuid.toUUID(),
      mediaUrl: areaTag1.mediaUrl
    })
  })
})
