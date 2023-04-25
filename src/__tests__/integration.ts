import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import { createServer } from '../server'
import { muuidToString, isMuuidHexStr } from '../utils/helpers'
import inMemoryDB from '../utils/inMemoryDB.js'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import MutableAreaDataSource, { createInstance as createAreaInstance } from '../model/MutableAreaDataSource.js'
import MutableOrganizationDataSource, { createInstance as createOrgInstance } from '../model/MutableOrganizationDataSource.js'
import { AreaType } from '../db/AreaTypes.js'
import { OrgType, OrganizationType, OperationType } from '../db/OrganizationTypes.js'
import { changelogDataSource } from '../model/ChangeLogDataSource.js'

jest.setTimeout(60000)
const PORT = 4000

interface QueryAPIProps {
  query: string
  operationName: string
  variables: any
  userUuid: string
  roles?: string[]
}
const queryAPI = async ({ query, operationName, variables, userUuid, roles = [] }: QueryAPIProps): Promise<request.Response> => {
  // Avoid needing to pass in actual signed tokens.
  const jwtSpy = jest.spyOn(jwt, 'verify')
  jwtSpy.mockImplementation(() => {
    return {
    // Roles defined at https://manage.auth0.com/dashboard/us/dev-fmjy7n5n/roles
      'https://tacos.openbeta.io/roles': roles,
      'https://tacos.openbeta.io/uuid': userUuid
    }
  })

  const queryObj = { query, operationName, variables }
  const response = await request(`http://localhost:${PORT}`)
    .post('/')
    .send(queryObj)
    .set('Authorization', 'Bearer placeholder-jwt-see-SpyOn')

  return response
}

describe('graphql server', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string

  // Mongoose models for mocking pre-existing state.
  let areas: MutableAreaDataSource
  let organizations: MutableOrganizationDataSource
  let usa: AreaType
  let ca: AreaType
  let wa: AreaType

  beforeAll(async () => {
    server = await createServer()
    await inMemoryDB.connect()
    await server.listen({ port: PORT })
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
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  describe('mutation API', () => {
    const createQuery = `
      mutation addOrganization($input: AddOrganizationInput!) {
        organization: addOrganization(input: $input) {
          orgId
          orgType 
          displayName
          associatedAreaIds
          excludedAreaIds
          createdBy
          updatedBy
        }
      }
    `
    const updateQuery = `
      mutation updateOrganization($input: OrganizationEditableFieldsInput!) {
        organization: updateOrganization(input: $input) {
          orgId
          associatedAreaIds
          excludedAreaIds
          displayName
          content {
            website
            email
            donationLink
            instagramLink
            description
          }
        }
      }
    `

    it('creates and updates an organization', async () => {
      const createResponse = await queryAPI({
        query: createQuery,
        operationName: 'addOrganization',
        variables: { input: { displayName: 'Friends of Openbeta', orgType: 'LOCAL_CLIMBING_ORGANIZATION' } },
        userUuid,
        roles: ['user_admin']
      })

      expect(createResponse.statusCode).toBe(200)
      const orgId = createResponse.body.data.organization.orgId
      // orgId is MUUID scalar type which should always be serialized into the muuid hex string format.
      expect(isMuuidHexStr(orgId)).toBeTruthy()
      expect(createResponse.body.data.organization.orgType).toBe('LOCAL_CLIMBING_ORGANIZATION')
      expect(createResponse.body.data.organization.displayName).toBe('Friends of Openbeta')
      expect(createResponse.body.data.organization.associatedAreaIds).toStrictEqual([])
      expect(createResponse.body.data.organization.excludedAreaIds).toStrictEqual([])
      expect(createResponse.body.data.organization.createdBy).toBe(userUuid)
      expect(createResponse.body.data.organization.updatedBy).toBe(userUuid)

      const updateResponse = await queryAPI({
        query: updateQuery,
        operationName: 'updateOrganization',
        variables: {
          input: {
            orgId,
            associatedAreaIds: [muuidToString(usa.metadata.area_id)],
            excludedAreaIds: [muuidToString(wa.metadata.area_id)],
            displayName: 'Allies of Openbeta',
            website: 'https://alliesofopenbeta.com',
            email: 'admin@alliesofopenbeta.com',
            donationLink: 'https://donate.alliesofopenbeta.com',
            instagramLink: 'https://instagram.com/alliesofopenbeta',
            description: 'We are allies of OpenBeta!'
          }
        },
        userUuid,
        roles: ['user_admin']
      })
      expect(updateResponse.statusCode).toBe(200)
      expect(updateResponse.body.errors).toBeUndefined()
      const orgResult = updateResponse.body.data.organization
      expect(orgResult.orgId).toBe(orgId)
      expect(orgResult.associatedAreaIds).toEqual([muuidToString(usa.metadata.area_id)])
      expect(orgResult.excludedAreaIds).toEqual([muuidToString(wa.metadata.area_id)])
      expect(orgResult.displayName).toBe('Allies of Openbeta')
      expect(orgResult.content.website).toBe('https://alliesofopenbeta.com')
      expect(orgResult.content.email).toBe('admin@alliesofopenbeta.com')
      expect(orgResult.content.donationLink).toBe('https://donate.alliesofopenbeta.com')
      expect(orgResult.content.instagramLink).toBe('https://instagram.com/alliesofopenbeta')
      expect(orgResult.content.description).toBe('We are allies of OpenBeta!')

      // eslint-disable-next-line
      await new Promise(res => setTimeout(res, 1000))

      const orgHistory = await changelogDataSource.getOrganizationChangeSets()
      expect(orgHistory).toHaveLength(2)

      // verify changes in most recent order
      expect(orgHistory[0].operation).toEqual(OperationType.updateOrganization)
      expect(orgHistory[1].operation).toEqual(OperationType.addOrganization)

      // history is shown most recent first
      const updateRecord = orgHistory[0].changes
      expect(updateRecord[0].dbOp).toEqual('update')
      expect(updateRecord[0].fullDocument._change?.historyId).toEqual(orgHistory[0]._id) // should point to current change
      expect(updateRecord[0].fullDocument.displayName).toBe('Allies of Openbeta')

      const createRecord = orgHistory[1].changes
      expect(createRecord[0].dbOp).toEqual('insert')
      expect(createRecord[0].fullDocument._change?.historyId).toEqual(orgHistory[1]._id) // should point to current change
      expect(createRecord[0].fullDocument.displayName).toBe('Friends of Openbeta')
    })

    it('throws an error if a non-user_admin tries to add an organization', async () => {
      const response = await queryAPI({
        query: createQuery,
        operationName: 'addOrganization',
        variables: { input: { displayName: 'Friends of Openbeta', orgType: 'LOCAL_CLIMBING_ORGANIZATION' } },
        userUuid,
        roles: ['editor']
      })
      expect(response.statusCode).toBe(200)
      expect(response.body.data.organization).toBeNull()
      expect(response.body.errors[0].message).toBe('Not Authorised!')
    })
  })

  describe('query API', () => {
    const organizationQuery = `
      query organization($input: MUUID) {
        organization(muuid: $input) {
          orgId
          associatedAreaIds
          excludedAreaIds
          displayName
          content {
            website
            email
            donationLink
            instagramLink
            description
          }
        }
      }
    `
    const organizationsQuery = `
      query organizations($filter: OrgFilter, $sort: OrgSort) {
        organizations(filter: $filter, sort: $sort) {
          orgId
          associatedAreaIds
          displayName
        }
      }
    `
    let alphaOrg: OrganizationType
    let betaOrg: OrganizationType
    let charlieOrg: OrganizationType

    beforeEach(async () => {
      let document: any = {
        displayName: 'Alpha Club',
        email: 'admin@alpha.com',
        associatedAreaIds: [ca.metadata.area_id, wa.metadata.area_id]
      }
      alphaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, document)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })

      document = {
        displayName: 'Beta Club',
        email: 'admin@beta.com'
      }
      betaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, document)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })

      document = {
        displayName: 'Charlie Beta Club',
        description: 'We are an offshoot of the beta club.\nSee our website for more details.'
      }
      charlieOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, document)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })
    })

    it('retrieves an organization with an MUUID', async () => {
      const response = await queryAPI({
        query: organizationQuery,
        operationName: 'organization',
        variables: { input: muuidToString(alphaOrg.orgId) },
        userUuid
      })
      expect(response.statusCode).toBe(200)
      const orgResult = response.body.data.organization
      expect(orgResult.orgId).toBe(muuidToString(alphaOrg.orgId))
      expect(orgResult.displayName).toBe('Alpha Club')
      expect(orgResult.associatedAreaIds.sort()).toEqual([muuidToString(ca.metadata.area_id), muuidToString(wa.metadata.area_id)].sort())
      expect(orgResult.content.email).toBe('admin@alpha.com')
    })

    it('retrieves organizations using an exactMatch displayName filter', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: { filter: { displayName: { match: 'Beta Club', exactMatch: true } } },
        userUuid
      })

      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(1)
      expect(dataResult[0].orgId).toBe(muuidToString(betaOrg.orgId))
    })

    it('retrieves organizations using a non-exactMatch displayName filter', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: { filter: { displayName: { match: 'beta', exactMatch: false } } },
        userUuid
      })
      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(2)
      expect(dataResult.map(o => o.orgId).sort()).toEqual([muuidToString(betaOrg.orgId), muuidToString(charlieOrg.orgId)].sort())
    })

    it('retrieves organizations using an associatedAreaIds filter', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: { filter: { associatedAreaIds: { includes: [muuidToString(ca.metadata.area_id)] } } },
        userUuid
      })
      // Graphql should convert `includes` from a string[] to MUUID[]
      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(1)
      expect(dataResult[0].orgId).toBe(muuidToString(alphaOrg.orgId))
    })
  })
})
