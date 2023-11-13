import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import MutableAreaDataSource from '../model/MutableAreaDataSource.js'
import MutableOrganizationDataSource from '../model/MutableOrganizationDataSource.js'
import { AreaType } from '../db/AreaTypes.js'
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

  beforeAll(async () => {
    ({ server, inMemoryDB } = await setUpServer())
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
    ca = await areas.addArea(user, 'CA', usa.metadata.area_id)
    wa = await areas.addArea(user, 'WA', usa.metadata.area_id)
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
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
  })
})
