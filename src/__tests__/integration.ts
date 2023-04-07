import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals';
import { createServer } from "../server"
import inMemoryDB from "../utils/inMemoryDB.js"
import request from 'supertest'
import jwt from 'jsonwebtoken'

const isBase64Str = (s: string): boolean => {
  const bc = /[A-Za-z0-9+/=]/.test(s);
  const lc = /.*=$/.test(s); // make sure it ends with '='
  return bc && lc;
}

const isMuuidHexStr = (s: string): boolean =>{
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  return regex.test(s)
}

describe('graphql server', () => {
  const port = 4000
  let server: ApolloServer; 
  let userUuid: string;

  beforeAll(async () => {
    server = await createServer();
    await inMemoryDB.connect()
    server.listen({ port });
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    userUuid = muuid.mode('relaxed').v4().toUUID().toString()
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  it('creates, updates and retrieves an organization', async () => {
    // Avoid needing to pass in actual signed tokens.
    const jwtSpy = jest.spyOn(jwt, 'verify')
    jwtSpy.mockImplementation(() => {return {
      // Roles defined at https://manage.auth0.com/dashboard/us/dev-fmjy7n5n/roles
      'https://tacos.openbeta.io/roles': ['user_admin'],
      'https://tacos.openbeta.io/uuid': userUuid
    }})

    const createQuery = `
      mutation addOrganization($input: AddOrganizationInput!) {
        organization: addOrganization(input: $input) {
          orgId,
          orgType, 
          displayName,
          associatedAreaIds,
          createdBy,
          updatedBy
        }
      }
    `
    const createMutation = {
      query: createQuery,
      operationName: 'addOrganization',
      variables: {input: {displayName: 'Friends of Openbeta', orgType: 'LOCAL_CLIMBING_ORGANIZATION'}}
    }
    const createResponse = await request(`http://localhost:${port}`)
      .post('/')
      .send(createMutation)
      .set('Authorization', `Bearer placeholder-jwt-see-SpyOn`)

    expect(createResponse.statusCode).toBe(200)
    const orgId = createResponse.body.data.organization.orgId
    // orgId is MUUID scalar type which should always be serialized into the muuid hex string format.
    expect(isMuuidHexStr(orgId)).toBeTruthy()
    expect(createResponse.body.data.organization.orgType).toBe('LOCAL_CLIMBING_ORGANIZATION')
    expect(createResponse.body.data.organization.displayName).toBe('Friends of Openbeta')
    expect(createResponse.body.data.organization.associatedAreaIds).toStrictEqual([])
    expect(createResponse.body.data.organization.createdBy).toBe(userUuid)
    expect(createResponse.body.data.organization.updatedBy).toBe(userUuid)

    const updateQuery = `
      mutation updateOrganization($input: OrganizationEditableFieldsInput!) {
        organization: updateOrganization(input: $input) {
          orgId,
        }
      }
    `
    const updateMutation = {
      query: updateQuery,
      operationName: 'updateOrganization',
      variables: {input: {
        orgId,
        associatedAreaIds: [],
        excludedAreaIds: [],
        displayName: 'Allies of Openbeta',
        website: 'https://alliesofopenbeta.com',
        email: 'admin@alliesofopenbeta.com',
        donationLink: 'https://donate.alliesofopenbeta.com',
        instagramLink: 'https://instagram.com/alliesofopenbeta',
        description: 'We are allies of OpenBeta!',
      }}
    }
    const updateResponse = await request(`http://localhost:${port}`)
      .post('/')
      .send(updateMutation)
      .set('Authorization', `Bearer placeholder-jwt-see-SpyOn`)

    expect(updateResponse.statusCode).toBe(200)
    expect(updateResponse.body.errors).toBeUndefined()
    expect(updateResponse.body.data.organization.orgId).toBe(orgId)

    const retrieveQueryString = `
      query organization($input: MUUID) {
        organization(muuid: $input) {
          orgId
          associatedAreaIds,
          excludedAreaIds,
          displayName,
          content {
            website,
            email,
            donationLink,
            instagramLink,
            description
          }
        }
      }
    `
    const retrieveQuery = {
      query: retrieveQueryString,
      operationName: 'organization',
      variables: { input: orgId }
    }
    const retrieveResponse = await request(`http://localhost:${port}`)
      .post('/')
      .send(retrieveQuery)
      .set('Authorization', `Bearer placeholder-jwt-see-SpyOn`)

    expect(retrieveResponse.statusCode).toBe(200)
    const orgResult = retrieveResponse.body.data.organization
    expect(orgResult.orgId).toBe(orgId)
    expect(orgResult.displayName).toBe('Allies of Openbeta')
    expect(orgResult.content.website).toBe('https://alliesofopenbeta.com')
    expect(orgResult.content.email).toBe('admin@alliesofopenbeta.com')
    expect(orgResult.content.donationLink).toBe('https://donate.alliesofopenbeta.com')
    expect(orgResult.content.instagramLink).toBe('https://instagram.com/alliesofopenbeta')
    expect(orgResult.content.description).toBe('We are allies of OpenBeta!')

  })

  it('throws an error if a non-user_admin tries to add an organization', async () => {
    const jwtSpy = jest.spyOn(jwt, 'verify')
    jwtSpy.mockImplementation(() => {return {
      'https://tacos.openbeta.io/roles': ['editor'],
      'https://tacos.openbeta.io/uuid': userUuid
    }})
    const createQuery = `
      mutation addOrganization($input: AddOrganizationInput!) {
        organization: addOrganization(input: $input) {
          orgId,
        }
      }
    `
    const mutation = {
      query: createQuery,
      operationName: 'addOrganization',
      variables: {input: {displayName: 'Friends of Openbeta', orgType: 'LOCAL_CLIMBING_ORGANIZATION'}}
    }
    const response = await request(`http://localhost:${port}`)
      .post('/')
      .send(mutation)
      .set('Authorization', `Bearer placeholder-jwt-see-SpyOn`)

    expect(response.statusCode).toBe(200)
    expect(response.body.data.organization).toBeNull()
    expect(response.body.errors[0].message).toBe("Not Authorised!")
  })

})
