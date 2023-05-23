import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import MutableAreaDataSource, { createInstance as createAreaInstance } from '../model/MutableAreaDataSource.js'
import { createInstance as createClimbInstance } from '../model/MutableClimbDataSource.js'
import MutableOrganizationDataSource, { createInstance as createOrgInstance } from '../model/MutableOrganizationDataSource.js'
import { AreaType } from '../db/AreaTypes.js'
import { ClimbChangeInputType } from '../db/ClimbTypes.js'
import { OrgType, OrganizationType, OrganizationEditableFieldsType } from '../db/OrganizationTypes.js'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString } from '../utils/helpers.js'

jest.setTimeout(60000)

describe('areas API', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let inMemoryDB

  // Mongoose models for mocking pre-existing state.
  let areas: MutableAreaDataSource
  let organizations: MutableOrganizationDataSource
  let usa: AreaType
  let ca: AreaType
  let wa: AreaType
  let ak: AreaType

  beforeAll(async () => {
    ({ server, inMemoryDB } = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    areas = createAreaInstance()
    organizations = createOrgInstance()
    usa = await areas.addCountry('usa')
    ca = await areas.addArea(user, 'CA', usa.metadata.area_id)
    wa = await areas.addArea(user, 'WA', usa.metadata.area_id)
    ak = await areas.addArea(user, 'AK', usa.metadata.area_id)
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  describe('mutations', () => {
    it('updates sorting order of subareas and queries returns them in order', async () => {
      const updateSortingOrderQuery = `
        mutation ($input: [AreaSortingInput]) {
          updateAreasSortingOrder(input: $input)
        }
      `
      const updateResponse = await queryAPI({
        query: updateSortingOrderQuery,
        variables: {
          input: [
            { areaId: wa.metadata.area_id, leftRightIndex: 3 },
            { areaId: ca.metadata.area_id, leftRightIndex: 0 },
            { areaId: ak.metadata.area_id, leftRightIndex: 10 }
          ]
        },
        userUuid
      })

      expect(updateResponse.statusCode).toBe(200)
      const sortingOrderResult = updateResponse.body.data.updateAreasSortingOrder
      expect(sortingOrderResult).toHaveLength(3)

      const areaChildrenQuery = `
        query area($input: ID) {
          area(uuid: $input) {
            children {
              uuid
              metadata {
                leftRightIndex
              }
            }
          }
        }
      `

      const areaChildrenResponse = await queryAPI({
        query: areaChildrenQuery,
        variables: { input: usa.metadata.area_id },
        userUuid
      })

      expect(areaChildrenResponse.statusCode).toBe(200)
      const areaResult = areaChildrenResponse.body.data.area
      // In leftRightIndex order
      expect(areaResult.children[0]).toMatchObject({ uuid: muuidToString(ca.metadata.area_id), metadata: { leftRightIndex: 0 } })
      expect(areaResult.children[1]).toMatchObject({ uuid: muuidToString(wa.metadata.area_id), metadata: { leftRightIndex: 3 } })
      expect(areaResult.children[2]).toMatchObject({ uuid: muuidToString(ak.metadata.area_id), metadata: { leftRightIndex: 10 } })
    })
  })

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

    it('retrieves an area and lists associated organizations', async () => {
      const response = await queryAPI({
        query: areaQuery,
        operationName: 'area',
        variables: { input: wa.metadata.area_id },
        userUuid
      })

      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(wa.metadata.area_id))
      expect(areaResult.organizations).toHaveLength(1)
      expect(areaResult.organizations[0].orgId).toBe(muuidToString(alphaOrg.orgId))
    })

    it('retrieves an area omitting organizations that exclude it', async () => {
      const response = await queryAPI({
        query: areaQuery,
        operationName: 'area',
        variables: { input: ca.metadata.area_id },
        userUuid
      })
      expect(response.statusCode).toBe(200)
      const areaResult = response.body.data.area
      expect(areaResult.uuid).toBe(muuidToString(ca.metadata.area_id))
      // Even though alphaOrg associates with ca's parent, usa, it excludes
      // ca and so should not be listed.
      expect(areaResult.organizations).toHaveLength(0)
    })

    it('returns climbs in leftRightIndex order', async () => {
      const climbs = createClimbInstance()
      const leftRoute: ClimbChangeInputType = {
        name: 'left',
        disciplines: { sport: true },
        description: 'Leftmost route on the wall',
        leftRightIndex: 0
      }
      const middleRoute: ClimbChangeInputType = {
        name: 'middle',
        disciplines: { sport: true },
        description: 'Middle route on the wall',
        leftRightIndex: 1
      }
      const rightRoute: ClimbChangeInputType = {
        name: 'right',
        disciplines: { sport: true },
        description: 'Rightmost route on the wall',
        leftRightIndex: 2
      }
      await climbs.addOrUpdateClimbs(
        user,
        ca.metadata.area_id,
        [middleRoute, leftRoute, rightRoute]
      )

      const areaClimbsQuery = `
        query area($input: ID) {
          area(uuid: $input) {
            climbs {
              name
              metadata {
                leftRightIndex
              }
            }
          }
        }
      `
      const areaClimbsResponse = await queryAPI({
        query: areaClimbsQuery,
        variables: { input: ca.metadata.area_id },
        userUuid
      })
      expect(areaClimbsResponse.statusCode).toBe(200)
      const areaResult = areaClimbsResponse.body.data.area
      // In leftRightIndex order
      expect(areaResult.climbs[0]).toMatchObject({ name: 'left', metadata: { leftRightIndex: 0 } })
      expect(areaResult.climbs[1]).toMatchObject({ name: 'middle', metadata: { leftRightIndex: 1 } })
      expect(areaResult.climbs[2]).toMatchObject({ name: 'right', metadata: { leftRightIndex: 2 } })
    })
  })
})
