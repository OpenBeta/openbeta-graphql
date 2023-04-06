import { ApolloServer } from 'apollo-server'
import muuid from 'uuid-mongodb'
import { jest } from '@jest/globals';
import { createServer } from "../server"
import inMemoryDB from "../utils/inMemoryDB.js"
import request from 'supertest'
import jwt from 'jsonwebtoken'

describe('graphql server', () => {
  const port = 4000
  let server: ApolloServer; 
  let userUuid: string;

  beforeAll(async () => {
    server = await createServer();
    await inMemoryDB.connect()
    server.listen({ port });
    userUuid = muuid.v4().toUUID().toString()
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
      'https://tacos.openbeta.io/roles': ['org_admin'],
      'https://tacos.openbeta.io/uuid': userUuid
    }})

    const createQuery = `
      mutation addOrganization($input: AddOrganizationInput!) {
        organization: addOrganization(input: $input) {
          orgId,
          orgType, 
          displayName,
          associatedAreaIds
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
    expect(response.body.data.organization.orgType).toBe('LOCAL_CLIMBING_ORGANIZATION')
    expect(response.body.data.organization.displayName).toBe('Friends of Openbeta')
    expect(response.body.data.organization.associatedAreaIds).toStrictEqual([])
  })


})