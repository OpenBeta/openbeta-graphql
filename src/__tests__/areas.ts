import { AreaType } from '../db/AreaTypes.js'
import { OrganizationEditableFieldsType, OrganizationType, OrgType } from '../db/OrganizationTypes.js'
import { muuidToString } from '../utils/helpers.js'
import { gqlTest } from './fixtures/gql.fixtures.js'
interface LocalContext {
  includedChild: AreaType
  excludedArea: AreaType
  alphaFields: OrganizationEditableFieldsType
  alphaOrg: OrganizationType
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
})
