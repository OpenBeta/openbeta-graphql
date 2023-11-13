import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import MutableMediaDataSource from '../MutableMediaDataSource'
import AreaDataSource from '../MutableAreaDataSource'
import ClimbDataSource from '../MutableClimbDataSource'

import { connectDB, createIndexes } from '../../db/index'
import { AreaType } from '../../db/AreaTypes'
import { EntityTag, MediaObject, MediaObjectGQLInput, AddTagEntityInput, UserMediaQueryInput, UserMedia } from '../../db/MediaObjectTypes'
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

  let areaForTagging1: AreaType
  let areaForTagging2: AreaType
  let climbIdForTagging: MUUID

  let areaTag1: AddTagEntityInput
  let areaTag2: AddTagEntityInput
  let climbTag: AddTagEntityInput

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

    const rs2 = await media.addMediaObjects([TEST_MEDIA])
    testMediaObject = rs2[0]
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
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should not tag a nonexistent area', async () => {
    const badAreaTag: AddTagEntityInput = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: muuid.v4() // some random area
    }
    await expect(media.addEntityTag(badAreaTag)).rejects.toThrow(/area .* not found/i)
  })

  it('should not tag a nonexistent *climb*', async () => {
    const badClimbTag: AddTagEntityInput = {
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

  it('should not add media with the same url', async () => {
    const mediaObj = {
      ...TEST_MEDIA,
      mediaUrl: 'photoAAA.jpg'
    }
    await media.addMediaObjects([mediaObj])

    const rs2 = await expect(media.addMediaObjects([mediaObj])).rejects.toThrowError(/duplicate key error collection/i)

    expect(rs2).toBeUndefined()
  })

  it('should delete media', async () => {
    const rs = await media.addMediaObjects([{
      ...TEST_MEDIA,
      mediaUrl: 'u/a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a5/photo100.jpg'
    }])

    expect(rs).toHaveLength(1)

    const rs2 = await media.deleteMediaObject(rs[0]._id)
    expect(rs2).toBe(true)

    await expect(media.deleteMediaObject(rs[0]._id)).rejects.toThrowError(/not found/i)
  })

  it('should not delete media with non-empty tags', async () => {
    const rs = await media.addMediaObjects([{
      ...TEST_MEDIA,
      mediaUrl: 'photo101.jpg',
      entityTag: { entityType: 0, entityId: climbIdForTagging.toUUID().toString() }
    }
    ])

    await expect(media.deleteMediaObject(rs[0]._id)).rejects.toThrowError(/Cannot delete media object with non-empty tags./i)
  })

  it('should return paginated media results', async () => {
    const ITEMS_PER_PAGE = 3
    const MEDIA_TEMPLATE: MediaObjectGQLInput = {
      ...TEST_MEDIA,
      userUuid: 'a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a5'
    }

    /**
     * Let's insert 7 media objects.
     * With 3 items per page we should expect 3 pages.
     */
    const newMediaListInput: MediaObjectGQLInput[] = []
    for (let i = 0; i < 7; i = i + 1) {
      newMediaListInput.push({ ...MEDIA_TEMPLATE, mediaUrl: `/photo${i}.jpg` })
    }

    const expectedMedia = await media.addMediaObjects(newMediaListInput)

    if (expectedMedia == null) {
      fail('Seeding test media fail')
    }

    // reverse because getOneUserMediaPagination() returns most recent first
    expectedMedia.reverse()

    const input: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE
    }

    const page1 = await media.getOneUserMediaPagination(input)

    verifyPageData(page1, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(0, 3), ITEMS_PER_PAGE, true)

    const page1Edges = page1.mediaConnection.edges
    const input2: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page1Edges[page1Edges.length - 1].cursor
    }
    const page2 = await media.getOneUserMediaPagination(input2)

    verifyPageData(page2, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(3, 6), ITEMS_PER_PAGE, true)

    const page2Edges = page2.mediaConnection.edges
    const input3: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page2Edges[page2Edges.length - 1].cursor
    }
    const page3 = await media.getOneUserMediaPagination(input3)

    verifyPageData(page3, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(6, 7), 1, false)
  })
})

/**
 * Verify media page data
 * @param actualPage
 * @param expectedUserUuid
 * @param expectedMedia
 * @param itemsPerPage
 * @param hasNextPage
 */
const verifyPageData = (
  actualPage: UserMedia,
  expectedUserUuid: string,
  expectedMedia: MediaObject[],
  itemsPerPage: number,
  hasNextPage: boolean): void => {
  expect(actualPage.userUuid).toEqual(expectedUserUuid)
  expect(actualPage.mediaConnection.pageInfo.hasNextPage).toStrictEqual(hasNextPage)

  const pageEdges = actualPage.mediaConnection.edges
  expect(pageEdges).toHaveLength(itemsPerPage)

  /**
   * We only need to spot check key fields.
   */
  pageEdges.forEach((edge, index) => {
    expect(edge.node._id).toEqual(expectedMedia[index]._id)
  })
}
