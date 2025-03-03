import { MediaObjectGQLInput } from '../db/MediaObjectTypes.js'
import { AreaType } from '../db/AreaTypes.js'
import { OrganizationEditableFieldsType, OrganizationType, OrgType } from '../db/OrganizationTypes.js'
import { muuidToString } from '../utils/helpers.js'
import { gqlTest } from './fixtures/gql.fixtures.js'
import gql from 'graphql-tag'
interface LocalContext {
  includedChild: AreaType
  excludedArea: AreaType
  alphaFields: OrganizationEditableFieldsType
  alphaOrg: OrganizationType
  insertMedia: (mediaCount: number, areaId?: string, user?: string) => Promise<void>
}

const it = gqlTest.extend<LocalContext>({
  includedChild: async ({ addArea, area }, use) => await use(await addArea(undefined, { parent: area })),
  excludedArea: async ({ addArea, area }, use) => await use(await addArea(undefined, { parent: area })),
  alphaFields: async ({ excludedArea, task, area }, use) => await use({
    displayName: task.id,
    associatedAreaIds: [area.metadata.area_id],
    excludedAreaIds: [excludedArea.metadata.area_id]
  }),
  alphaOrg: async ({ organizations, user, alphaFields }, use) => {
    const org = await organizations.addOrganization(user, OrgType.localClimbingOrganization, alphaFields)
      .then((res: OrganizationType | null) => {
        if (res === null) throw new Error('Failure mocking organization.')
        return res
      })

    await use(org)
    await organizations.deleteFromCacheById(org._id)
  },
  insertMedia: async ({ task, area, userUuid, media }, use) => {
    async function insertMediaObjectsForArea (mediaCount: number, areaId: string = muuidToString(area.metadata.area_id), user = userUuid): Promise<void> {
      const newMediaListInput: MediaObjectGQLInput[] = []
      for (let picIndex = 0; picIndex < mediaCount; picIndex++) {
        newMediaListInput.push({
          userUuid: user,
          width: 800,
          height: 600,
          format: 'jpeg',
          size: 45000,
          mediaUrl: `/areaPhoto${areaId}-${picIndex}.jpg`,
          entityTag: {
            entityType: 1,
            entityId: areaId
          }
        })
      }

      await media.addMediaObjects(newMediaListInput)
    }
    await use(insertMediaObjectsForArea)
  }
})

describe('areas API', () => {
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

    it('retrieves an area omitting organizations that exclude it', async ({ query, userUuid, excludedArea }) => {
      const response = await query({
        query: areaQuery,
        operationName: 'area',
        variables: { input: muuidToString(excludedArea.metadata.area_id) },
        userUuid
      })

      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult).toBeTruthy()
      expect(areaResult.uuid).toBe(muuidToString(excludedArea.metadata.area_id))
      // Even though alphaOrg associates with ca's parent, usa, it excludes
      // ca and so should not be listed.
      expect(areaResult.organizations).toHaveLength(0)
    })

    it('retrieves an area and lists associated organizations', async ({ query, userUuid, includedChild, alphaOrg }) => {
      const response = await query({
        query: areaQuery,
        operationName: 'area',
        variables: { input: muuidToString(includedChild.metadata.area_id) },
        userUuid
      })

      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(includedChild.metadata.area_id))
      expect(areaResult.organizations).toHaveLength(1)
      expect(areaResult.organizations[0].orgId).toBe(muuidToString(alphaOrg.orgId))
    })

    it('retrieves an area and lists associated organizations, even with no auth context', async ({ query, includedChild, alphaOrg }) => {
      const response = await query({
        query: areaQuery,
        operationName: 'area',
        variables: { input: muuidToString(includedChild.metadata.area_id) }
      })

      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(includedChild.metadata.area_id))
      expect(areaResult.organizations).toHaveLength(1)
      expect(areaResult.organizations[0].orgId).toBe(muuidToString(alphaOrg.orgId))
    })
  })

  it('returns paginated Media when requested', async ({ area, query, insertMedia }) => {
    await insertMedia(11)

    const areaQueryWithPaginatedMedia = gql`
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
    const response = await query({
      query: areaQueryWithPaginatedMedia,
      operationName: 'area',
      variables: {
        uuid: area.metadata.area_id,
        input: {
          first: 5,
          after: null
        }
      }
    })
    expect(response.statusCode).toBe(200)
    const areaResult = response.body.data.area
    expect(areaResult.mediaPagination.mediaConnection.edges).toHaveLength(5)
    expect(areaResult.mediaPagination.mediaConnection.pageInfo.totalItems).toBe(11)
    expect(areaResult.mediaPagination.mediaConnection.pageInfo.hasNextPage).toBe(true)
  })
})
