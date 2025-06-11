import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import MutableMediaDataSource from '../MutableMediaDataSource.js'
import AreaDataSource from '../MutableAreaDataSource.js'
import ClimbDataSource from '../MutableClimbDataSource.js'

import { createIndexes, getUserModel } from '../../db/index.js'
import { AreaType } from '../../db/AreaTypes.js'
import {
  AddTagEntityInput,
  EntityTag,
  MediaObject,
  MediaObjectGQLInput,
  UserMediaQueryInput,
  AreaMediaQueryInput,
  ClimbMediaQueryInput
} from '../../db/MediaObjectTypes.js'
import { newSportClimb1 } from './MutableClimbDataSource.js'
import inMemoryDB from '../../utils/inMemoryDB.js'
import { mediaAdded } from '../../google-cloud/adapter-interface.js'
import { safeRandomFilename } from '../../google-cloud/bucket.js'
import { muuidToString } from '../../utils/helpers.js'
import UserDataSource from '../UserDataSource.js'
import assert from 'node:assert'

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
  let areaForTagging3: AreaType
  let climbIdForTagging: MUUID

  let areaTag1: AddTagEntityInput
  let areaTag2: AddTagEntityInput
  let climbTag: AddTagEntityInput

  let testMediaObject: MediaObject

  beforeAll(async () => {
    await inMemoryDB.connect()

    areas = AreaDataSource.getInstance()
    climbs = ClimbDataSource.getInstance()
    media = MutableMediaDataSource.getInstance()
    const userModel = getUserModel()
    await userModel.insertMany([{
      _id: TEST_MEDIA.userUuid,
      usernameInfo: {
        username: 'test_user',
        canonicalName: 'test_user'
      }
    }])
  })

  beforeEach(async () => {
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
    areaForTagging3 = await areas.addArea(muuid.v4(), 'Shelf Road', null, 'USA')
    if (areaForTagging1 == null || areaForTagging2 == null || areaForTagging3 == null) fail('Fail to pre-seed test areas')

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
      entityUuid: areaForTagging2.metadata.area_id,
      topoData: { name: 'AA', value: '1234' }
    }

    climbTag = {
      mediaId: testMediaObject._id,
      entityType: 0,
      entityUuid: climbIdForTagging
    }
  })

  afterAll(async () => {
    await inMemoryDB.close()
  })

  describe('Pending media logic', () => {
    // When you create media that has no extant mediaUrl it will be made as a
    // pending media object.
    const pendingPattern: MediaObjectGQLInput = {
      userUuid: TEST_MEDIA.userUuid,
      width: 100,
      height: 100,
      size: 100 * 100,
      format: 'jpeg'
    }

    it('Should create a pending media object with random filename', async () => {
      const [pending] = await media.addMediaObjects([{ ...pendingPattern }])
      expect(pending.expiresAt).not.toBe(undefined)
      expect(pending.uploadTo).not.toBe(undefined)
      expect(pending.expiresAt).not.toBe(null)
      expect(pending.uploadTo).not.toBe(null)
    })

    it('Should create a non-pending media object', async () => {
      const [pending] = await media.addMediaObjects([{ ...pendingPattern, mediaUrl: safeRandomFilename() + '.jpeg' }])
      expect(pending.expiresAt).toBe(undefined)
      expect(pending.uploadTo).toBe(undefined)
    })

    it('Pending media object should be deleted by mongodb after its expiry time', async () => {
      const [pending] = await media.addMediaObjects([pendingPattern])

      // media expires in 10ms
      await media.mediaObjectModel.updateOne({ _id: pending._id }, { expiresAt: Date.now() + 10 })
      while (await media.mediaObjectModel.findOne({ _id: pending._id }) !== null) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    })

    it('Pending media object should mask filename by default', async () => {
      // at this point the media is pending
      const filename = safeRandomFilename() + '.jpeg'
      const [pending] = await media.addMediaObjects([{
        ...pendingPattern,
        filename
      }])

      expect(pending.mediaUrl.split('/')).not.toContain(filename)
      expect(pending.mediaUrl).not.toContain(filename)
    })

    it('Pending media object should throw error if mask suppression is requested but no filename is specified', async () => {
      // at this point the media is pending
      await expect(media.addMediaObjects([{
        ...pendingPattern,
        maskFilename: false
      }])).rejects.toThrow()
    })

    it('Pending media object should mask filename if requested', async () => {
      // at this point the media is pending
      const filename = safeRandomFilename() + 'jpeg'
      const [pending] = await media.addMediaObjects([{
        filename,
        ...pendingPattern,
        maskFilename: true
      }])

      expect(pending.mediaUrl.split('/')).not.toContain(filename)
      expect(pending.mediaUrl).not.toContain(filename)
    })

    it('Pending media object should use original filename if requested', async () => {
      // at this point the media is pending
      const filename = safeRandomFilename() + 'jpeg'
      const [pending] = await media.addMediaObjects([{
        ...pendingPattern,
        filename,
        maskFilename: false
      }])

      expect(pending.mediaUrl.split('/')).toContain(filename)
      expect(pending.mediaUrl).toContain(filename)
    })

    it('Identical pending media calls should not cause unique-key issues when an identifier is present', async () => {
      // at this point the media is pending
      const filename = safeRandomFilename() + 'jpeg'
      let [pending] = await media.addMediaObjects([{
        filename,
        ...pendingPattern,
        maskFilename: false
      }])

      expect(pending.mediaUrl.split('/')).toContain(filename)
      expect(pending.mediaUrl).toContain(filename)

      pending = await media.addMediaObjects([{
        filename,
        ...pendingPattern,
        maskFilename: false
      }]).then(x => x[0])

      expect(pending.mediaUrl.split('/')).toContain(filename)
      expect(pending.mediaUrl).toContain(filename)
    })

    it('Identical pending media calls SHOULD throw unique-key error when key collision appears accidental', async () => {
      // at this point the media is pending
      const filename = safeRandomFilename() + 'jpeg'
      const [pending] = await media.addMediaObjects([{
        filename,
        ...pendingPattern,
        maskFilename: false
      }])
      await mediaAdded({ objectId: pending.mediaUrl })

      await expect(media.addMediaObjects([{
        filename,
        ...pendingPattern,
        maskFilename: false
      }]).then(x => x[0]))
        .rejects
        .toThrow('E11000 duplicate key error collection: openbeta.media_objects index: mediaUrl_1 dup key:')
    })

    it('Pending media object should be reified if hook is called', async () => {
      const [pending] = await media.addMediaObjects([{
        ...pendingPattern,
        format: 'jpeg'
      }])

      await mediaAdded({ objectId: pending.mediaUrl })

      expect((await media.mediaObjectModel.findOne({ _id: pending._id }).orFail()).expiresAt).toBe(undefined)
    })
    it('Pending media should be elided when resolving climb photos', async () => {
      await media.findMediaByClimbId(climbIdForTagging)
      await media.getOneClimbMediaPagination({ climbUuid: climbIdForTagging })
    })
    it('Pending media should be elided when resolving area photos', async () => {
      await media.getOneAreaMediaPagination({ areaUuid: areaForTagging1.metadata.area_id })
    })

    it('Pending media should be elided when resolving user photos', async () => {
      const [pending] = await media.addMediaObjects([{
        ...pendingPattern,
        format: 'jpeg'
      }])

      expect(await media.getOneUserMedia(TEST_MEDIA.userUuid, 1_000).then(i => i.map(i => i.mediaUrl))).not.toContain(pending.mediaUrl)

      expect(
        await media.getOneUserMediaPagination({ userUuid: muuid.from(TEST_MEDIA.userUuid) })
          .then(i => i.mediaConnection.edges
            .map(i => i.node.mediaUrl))
      )
        .not
        .toContain(pending.mediaUrl)
    })

    it('Pending media should be elided from tags leaderboard', async () => {
      const userDs = UserDataSource.getInstance()

      const users = [muuid.v4(), muuid.v4()]
      await Promise.all(users.map(async (userUuid) =>
        await userDs.createOrUpdateUserProfile(
          userUuid, {
            email: `${userUuid.toString()}@openbeta.io`,
            username: `user-${process.uptime()}`,
            userUuid: userUuid.toString()
          })
      ))

      const entityTag = { entityId: muuidToString(climbIdForTagging), entityType: 0 }
      await Promise.all(users.map(i => muuidToString(i)).map(async (userUuid) =>
        await media.addMediaObjects([
          { ...pendingPattern, userUuid, mediaUrl: `/u/${userUuid.toString()}/${safeRandomFilename()}.jpeg`, entityTag }
        ]).then((media) => media.forEach(i => {
          expect(i.uploadTo).toBeUndefined()
          expect(i.expiresAt).toBeUndefined()
        }))
      ))

      const userTags = await media.getTagsLeaderboard().then(l => l.allTime.byUsers.find(i => i.userUuid.toString() === users[0].toString()))
      assert(userTags !== undefined)
      // create a new pending media object for the present leader
      await media.addMediaObjects([{
        ...pendingPattern,
        userUuid: muuidToString(userTags.userUuid)
      }])

      expect(userTags.total).toBe(1)

      const [pending] = await media.addMediaObjects([{
        ...pendingPattern,
        userUuid: muuidToString(userTags.userUuid),
        entityTag: {
          entityId: areaForTagging1.metadata.area_id.toString(),
          entityType: 1
        }
      }]).then((media) => media.map(mediaObject => {
        expect(mediaObject.uploadTo).not.toBeUndefined()
        expect(mediaObject.expiresAt).not.toBeUndefined()
        expect(mediaObject.entityTags).toHaveLength(1)
        return mediaObject
      }))

      // This should not change the count, since the media is unreified
      expect(
        await media.getTagsLeaderboard()
          .then(x => x.allTime.byUsers.find(u => u.userUuid.toString() === userTags.userUuid.toString()))
          .then(i => i?.total)
      ).toBe(userTags.total)

      // reification of this item should make the count increment by 1
      await mediaAdded({ objectId: pending.mediaUrl })
      expect(
        await media.getTagsLeaderboard()
          .then(x => x.allTime.byUsers.find(u => u.userUuid.toString() === userTags.userUuid.toString()))
          .then(i => i?.total)
      ).toBe(userTags.total + 1)
    })
  })

  it('should not tag a nonexistent area', async () => {
    const badAreaTag: AddTagEntityInput = {
      mediaId: testMediaObject._id,
      entityType: 1,
      entityUuid: muuid.v4() // some random area
    }
    await expect(media.upsertEntityTag(badAreaTag)).rejects.toThrow(/area .* not found/i)
  })

  it('should not tag a nonexistent *climb*', async () => {
    const badClimbTag: AddTagEntityInput = {
      mediaId: testMediaObject._id,
      entityType: 0,
      entityUuid: muuid.v4() // some random climb
    }
    await expect(media.upsertEntityTag(badClimbTag)).rejects.toThrow(/climb .* not found/i)
  })

  it('should tag & remove an area tag', async () => {
    if (areaForTagging1 == null) fail('Pre-seeded test area not found')

    // verify the number tags before test
    let mediaObjects = await media.getOneUserMedia(TEST_MEDIA.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(0)

    // add 1st tag
    await media.upsertEntityTag(areaTag1)

    // add 2nd tag
    const tag = await media.upsertEntityTag(climbTag)

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
    const updating = { ...areaTag2, topoData: { name: 'ZZ' } }
    const newTag = await media.upsertEntityTag(updating)
    expect(newTag.targetId).toEqual(areaTag2.entityUuid)
    expect(newTag.topoData).toEqual(updating.topoData)
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

  it('should return paginated user media results', async () => {
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
    const mediaCount = 7
    for (let i = 0; i < mediaCount; i = i + 1) {
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

    verifyPageData(page1, MEDIA_TEMPLATE.userUuid, 'userUuid', expectedMedia.slice(0, 3), mediaCount, ITEMS_PER_PAGE, true)

    const page1Edges = page1.mediaConnection.edges
    const input2: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page1Edges[page1Edges.length - 1].cursor
    }
    const page2 = await media.getOneUserMediaPagination(input2)

    verifyPageData(page2, MEDIA_TEMPLATE.userUuid, 'userUuid', expectedMedia.slice(3, 6), mediaCount, ITEMS_PER_PAGE, true)

    const page2Edges = page2.mediaConnection.edges
    const input3: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page2Edges[page2Edges.length - 1].cursor
    }
    const page3 = await media.getOneUserMediaPagination(input3)

    verifyPageData(page3, MEDIA_TEMPLATE.userUuid, 'userUuid', expectedMedia.slice(6, 7), mediaCount, 1, false)
  })

  it('should return paginated area media results', async () => {
    const ITEMS_PER_PAGE = 3
    const MEDIA_TEMPLATE: MediaObjectGQLInput = {
      ...TEST_MEDIA,
      userUuid: 'a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a6'
    }

    /**
     * Let's insert 7 media objects with the appropriate areaId in entityTags.
     * With 3 items per page we should expect 3 pages.
     */
    const newMediaListInput: MediaObjectGQLInput[] = []
    const mediaCount = 7
    for (let i = 0; i < mediaCount; i = i + 1) {
      newMediaListInput.push({
        ...MEDIA_TEMPLATE,
        mediaUrl: `/areaPhoto${i}.jpg`,
        entityTag: {
          entityType: 1,
          entityId: areaForTagging3.metadata.area_id.toUUID().toString()
        }
      })
    }

    const expectedMedia = await media.addMediaObjects(newMediaListInput)

    if (expectedMedia == null) {
      fail('Seeding test media fail')
    }

    // reverse because getOneAreaMediaPagination() returns most recent first
    expectedMedia.reverse()

    const input: AreaMediaQueryInput = {
      areaUuid: muuid.from(areaForTagging3.metadata.area_id),
      first: ITEMS_PER_PAGE
    }

    const page1 = await media.getOneAreaMediaPagination(input)

    verifyPageData(page1, areaForTagging3.metadata.area_id.toString(), 'areaUuid', expectedMedia.slice(0, 3), mediaCount, ITEMS_PER_PAGE, true)

    const page1Edges = page1.mediaConnection.edges
    const input2: AreaMediaQueryInput = {
      areaUuid: muuid.from(areaForTagging3.metadata.area_id),
      first: ITEMS_PER_PAGE,
      after: page1Edges[page1Edges.length - 1].cursor
    }
    const page2 = await media.getOneAreaMediaPagination(input2)

    verifyPageData(page2, areaForTagging3.metadata.area_id.toString(), 'areaUuid', expectedMedia.slice(3, 6), mediaCount, ITEMS_PER_PAGE, true)

    const page2Edges = page2.mediaConnection.edges
    const input3: AreaMediaQueryInput = {
      areaUuid: muuid.from(areaForTagging3.metadata.area_id),
      first: ITEMS_PER_PAGE,
      after: page2Edges[page2Edges.length - 1].cursor
    }
    const page3 = await media.getOneAreaMediaPagination(input3)

    verifyPageData(page3, areaForTagging3.metadata.area_id.toString(), 'areaUuid', expectedMedia.slice(6, 7), mediaCount, 1, false)
  })

  it('should return paginated climb media results', async () => {
    const ITEMS_PER_PAGE = 4
    const MEDIA_TEMPLATE: MediaObjectGQLInput = {
      ...TEST_MEDIA,
      userUuid: 'a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a7'
    }

    /**
     * insert 11 media objects with the appropriate climbId in entityTags.
     * With 4 items per page we should expect 3 pages.
     */
    const newMediaListInput: MediaObjectGQLInput[] = []
    const mediaCount = 11
    for (let i = 0; i < mediaCount; i = i + 1) {
      newMediaListInput.push({
        ...MEDIA_TEMPLATE,
        mediaUrl: `/climbPhoto${i}.jpg`,
        entityTag: {
          entityType: 0,
          entityId: climbIdForTagging.toUUID().toString()
        }
      })
    }

    const expectedMedia = await media.addMediaObjects(newMediaListInput)

    if (expectedMedia == null) {
      fail('Seeding test media fail')
    }

    // reverse because getOneClimbMediaPagination() returns most recent first
    expectedMedia.reverse()

    const input: ClimbMediaQueryInput = {
      climbUuid: muuid.from(climbIdForTagging),
      first: ITEMS_PER_PAGE
    }

    const page1 = await media.getOneClimbMediaPagination(input)

    verifyPageData(page1, climbIdForTagging.toString(), 'climbUuid', expectedMedia.slice(0, 4), mediaCount, ITEMS_PER_PAGE, true)

    const page1Edges = page1.mediaConnection.edges
    const input2: ClimbMediaQueryInput = {
      climbUuid: muuid.from(climbIdForTagging),
      first: ITEMS_PER_PAGE,
      after: page1Edges[page1Edges.length - 1].cursor
    }
    const page2 = await media.getOneClimbMediaPagination(input2)

    verifyPageData(page2, climbIdForTagging.toString(), 'climbUuid', expectedMedia.slice(4, 8), mediaCount, ITEMS_PER_PAGE, true)

    const page2Edges = page2.mediaConnection.edges
    const input3: ClimbMediaQueryInput = {
      climbUuid: muuid.from(climbIdForTagging),
      first: ITEMS_PER_PAGE,
      after: page2Edges[page2Edges.length - 1].cursor
    }
    const page3 = await media.getOneClimbMediaPagination(input3)

    verifyPageData(page3, climbIdForTagging.toString(), 'climbUuid', expectedMedia.slice(8, 11), mediaCount, 3, false)
  })
})

/**
 * Verify media page data
 * @param actualPage
 * @param expectedUuid
 * @param expectedUuidType "userUuid" | "areaUuid" | "climbUuid"
 * @param expectedMedia
 * @param totalItems
 * @param itemsPerPage
 * @param hasNextPage
 */
const verifyPageData = (
  actualPage: any,
  expectedUuid: string,
  expectedUuidType: string,
  expectedMedia: MediaObject[],
  totalItems: number,
  itemsPerPage: number,
  hasNextPage: boolean): void => {
  if (expectedUuidType === 'userUuid') {
    expect(actualPage.userUuid).toEqual(expectedUuid)
  } else if (expectedUuidType === 'areaUuid') {
    expect(actualPage.areaUuid).toEqual(expectedUuid)
  } else if (expectedUuidType === 'climbUuid') {
    expect(actualPage.climbUuid).toEqual(expectedUuid)
  }
  expect(actualPage.mediaConnection.pageInfo.hasNextPage).toStrictEqual(hasNextPage)
  expect(actualPage.mediaConnection.pageInfo.totalItems).toStrictEqual(totalItems)
  const pageEdges = actualPage.mediaConnection.edges
  expect(pageEdges).toHaveLength(itemsPerPage)

  /**
   * We only need to spot check key fields.
   */
  pageEdges.forEach((edge, index) => {
    expect(edge.node._id).toEqual(expectedMedia[index]._id)
  })
}
