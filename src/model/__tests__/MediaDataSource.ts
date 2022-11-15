import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MediaDataSource from '../MediaDataSource'
import AreaDataSource from '../MutableAreaDataSource'

import { connectDB, createIndexes, getAreaModel, getMediaModel } from '../../db/index.js'
import { MediaInputType, TagEntryResultType } from '../../db/MediaTypes.js'
import { AreaType } from '../../db/AreaTypes.js'

describe('MediaDataSource', () => {
  let media: MediaDataSource
  let areas: AreaDataSource
  let areaForTagging: AreaType | null

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getMediaModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    media = new MediaDataSource(mongoose.connection.db.collection('media'))
    areas = new AreaDataSource(mongoose.connection.db.collection('areas'))

    await createIndexes()

    await areas.addCountry('USA')
    areaForTagging = await areas.addArea(muuid.v4(), 'Yosemite NP', null, 'USA')
  })

  afterAll(async () => {
    await mongoose.connection.close()
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

    const input: MediaInputType = {
      mediaType: 0,
      mediaUuid: muuid.v4(),
      mediaUrl: 'boo.jpg',
      destinationId: areaForTagging.metadata.area_id,
      destType: 1 // 0: climb, 1: area
    }

    const tag: TagEntryResultType | null = await media.setTag(input)

    expect(tag).toMatchObject({
      mediaType: input.mediaType,
      mediaUuid: input.mediaUuid.toUUID(),
      mediaUrl: input.mediaUrl,
      destinationId: expect.objectContaining({
        area_name: areaForTagging.area_name
      })
    })

    // remove tag
    const res = await media.removeTag(input.mediaUuid, input.destinationId)
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
})
