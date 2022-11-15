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
      mediaUrl: `/u/${muuid.v4().toUUID.toString()}/boo.jpg`,
      destinationId: areaForTagging?.metadata.area_id,
      destType: 1 // 0: climb, 1: area
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
      mediaUrl: `/u/${muuid.v4().toUUID.toString()}/boo.jpg`,
      destinationId: muuid.v4(), // random area id - doesn't exist!
      destType: 1 // 0: climb, 1: area
    }
    await expect(media.setTag(input)).rejects.toThrow(/doesn't exist/)
  })

  it('should set & remove an area tag', async () => {
    if (areaForTagging == null) fail('Pre-seeded test area not found')

    const tag: TagEntryResultType | null = await media.setTag(areaTag1)

    expect(tag).toMatchObject({
      mediaType: areaTag1.mediaType,
      mediaUuid: areaTag1.mediaUuid.toUUID(),
      mediaUrl: areaTag1.mediaUrl,
      destinationId: expect.objectContaining({
        area_name: areaForTagging.area_name
      })
    })

    // remove tag
    const res = await media.removeTag(areaTag1.mediaUuid, areaTag1.destinationId)
    expect(res?.removed).toBeTruthy()
  })

  it('should prevent a duplicate area tag', async () => {
    if (areaForTagging == null) fail('Pre-seeded test area not found')

    const randomId = muuid.v4()
    const input: MediaInputType = {
      mediaType: 0,
      mediaUuid: randomId,
      mediaUrl: 'woof.jpg',
      destinationId: areaForTagging.metadata.area_id,
      destType: 1 // 0: climb, 1: area
    }

    await media.setTag(input)

    // should throw an error
    await expect(media.setTag(input)).rejects.toThrowError(/Duplicate/)
  })

  it('should return recent tags', async () => {
    if (areaForTagging == null) fail('Pre-seeded test area not found')

    let tags = await media.getRecentTags()
    expect(tags).toHaveLength(0)

    await media.setTag({ ...areaTag1, destinationId: areaForTagging.metadata.area_id })
    tags = await media.getRecentTags()

    expect(tags).toHaveLength(1)
  })
})
