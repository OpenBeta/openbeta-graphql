import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { AreaType } from '../../db/AreaTypes.js'
import {
  AddTagEntityInput,
  EntityTag,
  MediaObject,
  MediaObjectGQLInput,
  UserMedia,
  UserMediaQueryInput
} from '../../db/MediaObjectTypes.js'
import { gqlTest } from '../../__tests__/fixtures/gql.fixtures.js'

interface LocalContext {
  mediaInput: MediaObjectGQLInput
  mediaObject: MediaObject
  otherArea: AreaType

  areaTag1: AddTagEntityInput
  areaTag2: AddTagEntityInput
  climbTag: AddTagEntityInput
}

const it = gqlTest.extend<LocalContext>({
  mediaInput: async ({ task, userUuid }, use) => await use({
    userUuid,
    mediaUrl: `/u/${userUuid}/${task.id}.jpg`,
    width: 800,
    height: 600,
    format: 'jpeg',
    size: 45000
  }),
  otherArea: async ({ addArea }, use) => await use(await addArea()),
  mediaObject: async ({ media, mediaInput }, use) => await use((await media.addMediaObjects([mediaInput]))[0]),

  areaTag1: async ({ area, mediaObject }, use) => await use({
    mediaId: mediaObject._id,
    entityType: 1,
    entityUuid: area.metadata.area_id
  }),

  areaTag2: async ({ otherArea, mediaObject }, use) => await use({
    mediaId: mediaObject._id,
    entityType: 1,
    entityUuid: otherArea.metadata.area_id,
    topoData: { name: 'AA', value: '1234' }
  }),

  climbTag: async ({ climb, mediaObject }, use) => await use({
    mediaId: mediaObject._id,
    entityType: 0,
    entityUuid: climb._id
  })
})

describe('MediaDataSource', () => {
  it('should not tag a nonexistent area', async ({ media, mediaObject }) => {
    const badAreaTag: AddTagEntityInput = {
      mediaId: mediaObject._id,
      entityType: 1,
      entityUuid: muuid.v4() // some random area
    }
    await expect(media.upsertEntityTag(badAreaTag)).rejects.toThrow(/area .* not found/i)
  })

  it('should not tag a nonexistent *climb*', async ({ media, mediaObject }) => {
    const badClimbTag: AddTagEntityInput = {
      mediaId: mediaObject._id,
      entityType: 0,
      entityUuid: muuid.v4() // some random climb
    }
    await expect(media.upsertEntityTag(badClimbTag)).rejects.toThrow(/climb .* not found/i)
  })

  it('should tag & remove an area tag', async ({ media, mediaInput, areaTag1, climbTag, area, climb }) => {
    // verify the number tags before test
    let mediaObjects = await media.getOneUserMedia(mediaInput.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(0)

    // add 1climbNamest tag
    await media.upsertEntityTag(areaTag1)

    // add 2nd tag
    const tag = await media.upsertEntityTag(climbTag)

    expect(tag).toMatchObject<Partial<EntityTag>>({
      targetId: climbTag.entityUuid,
      type: climbTag.entityType,
      areaName: area.area_name,
      ancestors: area.ancestors,
      climbName: climb.name,
      lnglat: area.metadata.lnglat
    })

    // verify the number tags
    mediaObjects = await media.getOneUserMedia(mediaInput.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(2)

    // remove tag
    const res = await media.removeEntityTag({ mediaId: climbTag.mediaId, tagId: tag._id })
    expect(res).toBe(true)

    // verify the number tags
    mediaObjects = await media.getOneUserMedia(mediaInput.userUuid, 10)
    expect(mediaObjects[0].entityTags).toHaveLength(1)
  })

  it('should handle delete tag errors gracefully', async ({ media, mediaObject }) => {
    // with invalid id format
    await expect(media.removeEntityTag({
      mediaId: mediaObject._id,
      // @ts-expect-error
      tagId: 'abc' // bad ObjectId format
    })).rejects.toThrowError(/Cast to ObjectId failed/i)

    // remove a random tag that doesn't exist
    await expect(media.removeEntityTag({
      mediaId: new mongoose.Types.ObjectId(),
      tagId: new mongoose.Types.ObjectId()
    })).rejects.toThrowError(/not found/i)
  })

  it('should not add a duplicate tag', async ({ areaTag2, media }) => {
    const updating = { ...areaTag2, topoData: { name: 'ZZ' } }
    const newTag = await media.upsertEntityTag(updating)
    expect(newTag.targetId).toEqual(areaTag2.entityUuid)
    expect(newTag.topoData).toEqual(updating.topoData)
  })

  it('should not add media with the same url', async ({ mediaInput, media }) => {
    const mediaObj = {
      ...mediaInput,
      mediaUrl: 'photoAAA.jpg'
    }
    await media.addMediaObjects([mediaObj])

    await expect(async () => await media.addMediaObjects([mediaObj])).rejects.toThrowError('duplicate key error collection')
  })

  it('should delete media', async ({ mediaInput, media }) => {
    const rs = await media.addMediaObjects([{
      ...mediaInput,
      mediaUrl: 'u/a0ca9ebb-aa3b-4bb0-8ddd-7c8b2ed228a5/photo100.jpg'
    }])

    expect(rs).toHaveLength(1)

    const rs2 = await media.deleteMediaObject(rs[0]._id)
    expect(rs2).toBe(true)

    await expect(async () => await media.deleteMediaObject(rs[0]._id)).rejects.toThrowError('not found')
  })

  it('should not delete media with non-empty tags', async ({ mediaInput, media, climb }) => {
    const rs = await media.addMediaObjects([{
      ...mediaInput,
      mediaUrl: 'photo101.jpg',
      entityTag: { entityType: 0, entityId: climb._id.toUUID().toString() }
    }
    ])

    await expect(async () => await media.deleteMediaObject(rs[0]._id)).rejects.toThrowError('Cannot delete media object with non-empty tags.')
  })

  it('should return paginated media results', async ({ mediaInput, media }) => {
    const ITEMS_PER_PAGE = 3
    const MEDIA_TEMPLATE: MediaObjectGQLInput = {
      ...mediaInput,
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

    assert(expectedMedia != null, 'seeding test media fail')

    // reverse because getOneUserMediaPagination() returns most recent first
    expectedMedia.reverse()

    const input: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE
    }

    const page1 = await media.getOneUserMediaPagination(input)

    verifyPageData(page1, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(0, 3), mediaCount, ITEMS_PER_PAGE, true)

    const page1Edges = page1.mediaConnection.edges
    const input2: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page1Edges[page1Edges.length - 1].cursor
    }
    const page2 = await media.getOneUserMediaPagination(input2)

    verifyPageData(page2, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(3, 6), mediaCount, ITEMS_PER_PAGE, true)

    const page2Edges = page2.mediaConnection.edges
    const input3: UserMediaQueryInput = {
      userUuid: muuid.from(MEDIA_TEMPLATE.userUuid),
      first: ITEMS_PER_PAGE,
      after: page2Edges[page2Edges.length - 1].cursor
    }
    const page3 = await media.getOneUserMediaPagination(input3)

    verifyPageData(page3, MEDIA_TEMPLATE.userUuid, expectedMedia.slice(6, 7), mediaCount, 1, false)
  })
})

/**
 * Verify media page data
 * @param actualPage
 * @param expectedUserUuid
 * @param expectedMedia
 * @param totalItems
 * @param itemsPerPage
 * @param hasNextPage
 */
const verifyPageData = (
  actualPage: UserMedia,
  expectedUserUuid: string,
  expectedMedia: MediaObject[],
  totalItems: number,
  itemsPerPage: number,
  hasNextPage: boolean): void => {
  expect(actualPage.userUuid).toEqual(expectedUserUuid)
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
