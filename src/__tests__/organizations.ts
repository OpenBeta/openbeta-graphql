import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals'
import MutableAreaDataSource, { createInstance as createAreaInstance } from '../model/MutableAreaDataSource.js'
import MutableOrganizationDataSource, { createInstance as createOrgInstance } from '../model/MutableOrganizationDataSource.js'
import { AreaType } from '../db/AreaTypes.js'
import { OrgType, OrganizationType, OperationType, OrganizationEditableFieldsType } from '../db/OrganizationTypes.js'
import { changelogDataSource } from '../model/ChangeLogDataSource.js'
import { queryAPI, setUpServer } from '../utils/testUtils.js'
import { muuidToString, isMuuidHexStr } from '../utils/helpers.js'

jest.setTimeout(60000)

describe('organizations API', () => {
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

  describe('mutations', () => {
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

  describe('queries', () => {
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
            facebookLink
            description
          }
        }
      }
    `
    const organizationsQuery = `
      query organizations($filter: OrgFilter, $sort: OrgSort, $limit: Int) {
        organizations(filter: $filter, sort: $sort, limit: $limit) {
          orgId
          associatedAreaIds
          displayName
        }
      }
    `
    let alphaFields: OrganizationEditableFieldsType
    let deltaFields: OrganizationEditableFieldsType
    let gammaFields: OrganizationEditableFieldsType
    let alphaOrg: OrganizationType
    let deltaOrg: OrganizationType
    let gammaOrg: OrganizationType

    beforeEach(async () => {
      alphaFields = {
        displayName: 'Alpha OpenBeta Club',
        associatedAreaIds: [ca.metadata.area_id, wa.metadata.area_id],
        email: 'admin@alphaopenbeta.com',
        facebookLink: 'https://www.facebook.com/alphaopenbeta',
        instagramLink: 'https://www.instagram.com/alphaopenbeta'
      }
      alphaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, alphaFields)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })

      deltaFields = {
        displayName: 'Delta OpenBeta Club',
        email: 'admin@deltaopenbeta.com'
      }
      deltaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, deltaFields)
        .then((res: OrganizationType | null) => {
          if (res === null) throw new Error('Failure mocking organization.')
          return res
        })

      gammaFields = {
        displayName: 'Delta Gamma OpenBeta Club',
        description: 'We are an offshoot of the delta club.\nSee our website for more details.'
      }
      gammaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, gammaFields)
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
      expect(orgResult.displayName).toBe(alphaFields.displayName)
      expect(orgResult.associatedAreaIds.sort()).toEqual([muuidToString(ca.metadata.area_id), muuidToString(wa.metadata.area_id)].sort())
      expect(orgResult.content.email).toBe(alphaFields.email)
      expect(orgResult.content.instagramLink).toBe(alphaFields.instagramLink)
      expect(orgResult.content.facebookLink).toBe(alphaFields.facebookLink)
    })

    it('retrieves organizations using an exactMatch displayName filter', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: { filter: { displayName: { match: 'Delta OpenBeta Club', exactMatch: true } } },
        userUuid
      })

      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(1)
      expect(dataResult[0].orgId).toBe(muuidToString(deltaOrg.orgId))
    })

    it('retrieves organizations using a non-exactMatch displayName filter', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: { filter: { displayName: { match: 'delta', exactMatch: false } } },
        userUuid
      })
      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(2)
      expect(dataResult.map(o => o.orgId).sort()).toEqual([muuidToString(deltaOrg.orgId), muuidToString(gammaOrg.orgId)].sort())
    })

    it('limits organizations returned', async () => {
      const response = await queryAPI({
        query: organizationsQuery,
        operationName: 'organizations',
        variables: {
          limit: 1
        },
        userUuid
      })
      expect(response.statusCode).toBe(200)
      const dataResult = response.body.data.organizations
      expect(dataResult.length).toBe(1) // Three matching orgs, but only return one.
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
