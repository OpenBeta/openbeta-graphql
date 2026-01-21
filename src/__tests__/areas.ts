import { ApolloServer } from '@apollo/server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import MutableAreaDataSource from '../model/MutableAreaDataSource.js'
import MutableMediaDataSource from '../model/MutableMediaDataSource.js'
import MutableOrganizationDataSource from '../model/MutableOrganizationDataSource.js'
import { MediaObjectGQLInput } from '../db/MediaObjectTypes.js'
import { AreaType } from '../db/AreaTypes.js'
import { OrganizationEditableFieldsType, OrganizationType, OrgType } from '../db/OrganizationTypes.js'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString } from '../utils/helpers.js'
import { InMemoryDB } from '../utils/inMemoryDB.js'
import express from 'express'

jest.setTimeout(60000)

describe('areas API', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB

  // Mongoose models for mocking pre-existing state.
  let areas: MutableAreaDataSource
  let organizations: MutableOrganizationDataSource
  let usa: AreaType
  let ca: AreaType
  let wa: AreaType

  beforeAll(async () => {
    ({ server, inMemoryDB, app } = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    areas = MutableAreaDataSource.getInstance()
    organizations = MutableOrganizationDataSource.getInstance()
    usa = await areas.addCountry('usa')
    ca = await areas.addArea(user, { areaName: 'CA', parentUuid: usa.metadata.area_id })
    wa = await areas.addArea(user, { areaName: 'WA', parentUuid: usa.metadata.area_id })
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  async function insertMediaObjectsForArea (areaId: string, mediaCount: number): Promise<void> {
    const newMediaListInput: MediaObjectGQLInput[] = []
    for (let i = 0; i < mediaCount; i++) {
      newMediaListInput.push({
        userUuid: 'a2eb6353-65d1-445f-912c-53c6301404bd',
        width: 800,
        height: 600,
        format: 'jpeg',
        size: 45000,
        mediaUrl: `/areaPhoto${i}.jpg`,
        entityTag: {
          entityType: 1,
          entityId: areaId
        }
      })
    }

    const media = MutableMediaDataSource.getInstance()
    await media.addMediaObjects(newMediaListInput)
  }

  describe('queries', () => {
    const areaQuery = `
      query area($input: ID) {
        area(uuid: $input) {
          uuid
          organizations {
            orgId
          }
        }
      }
    `
    let alphaFields: OrganizationEditableFieldsType
    let alphaOrg: OrganizationType

    beforeEach(async () => {
      alphaFields = {
        displayName: 'USA without CA Org',
        associatedAreaIds: [usa.metadata.area_id],
        excludedAreaIds: [ca.metadata.area_id]
      }
      alphaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, alphaFields)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })
    })

    it('retrieves an area and its cumulative media weight', async () => {
      const response = await queryAPI({
        query: `
          query area($input: ID) {
            area(uuid: $input) {
              uuid
              imageByteSum
            }
          }
        `,
        operationName: 'area',
        variables: { input: ca.metadata.area_id },
        userUuid,
        app
      })
      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(ca.metadata.area_id))
      expect(areaResult.imageByteSum).toBe(0)
    })

    it('retrieves an area omitting organizations that exclude it', async () => {
      const response = await queryAPI({
        query: areaQuery,
        operationName: 'area',
        variables: { input: ca.metadata.area_id },
        userUuid,
        app
      })
      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(ca.metadata.area_id))
      // Even though alphaOrg associates with ca's parent, usa, it excludes
      // ca and so should not be listed.
      expect(areaResult.organizations).toHaveLength(0)
    })

    it.each([userUuid, undefined])('retrieves an area and lists associated organizations', async (userId) => {
      const response = await queryAPI({
        query: areaQuery,
        operationName: 'area',
        variables: { input: wa.metadata.area_id },
        userUuid: userId,
        app
      })

      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(wa.metadata.area_id))
      expect(areaResult.organizations).toHaveLength(1)
      expect(areaResult.organizations[0].orgId).toBe(muuidToString(alphaOrg.orgId))
    })
  })

  it('returns paginated Media when requested', async () => {
    await insertMediaObjectsForArea(usa.metadata.area_id.toString(), 11)

    const areaQueryWithPaginatedMedia = `
      query area($uuid: ID!, $input: EmbeddedAreaMediaInput) {
        area(uuid: $uuid) {
          mediaPagination(input: $input) {
            areaUuid
            mediaConnection {
              edges {
                node {
                  id
                  mediaUrl
                }
                cursor
              }
              pageInfo {
                hasNextPage
                totalItems
                endCursor
              }
            }
          }
        }
      }
    `
    const response = await queryAPI({
      query: areaQueryWithPaginatedMedia,
      operationName: 'area',
      variables: {
        uuid: usa.metadata.area_id,
        input: {
          first: 5,
          after: null
        }
      },
      userUuid,
      app
    })
    expect(response.statusCode).toBe(200)
    const areaResult = response.body.data.area
    expect(areaResult.mediaPagination.mediaConnection.edges).toHaveLength(5)
    expect(areaResult.mediaPagination.mediaConnection.pageInfo.totalItems).toBe(11)
    expect(areaResult.mediaPagination.mediaConnection.pageInfo.hasNextPage).toBe(true)
  })
})
