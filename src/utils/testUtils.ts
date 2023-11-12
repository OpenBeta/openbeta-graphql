import jwt from 'jsonwebtoken'
import { jest } from '@jest/globals'
import request from 'supertest'
import inMemoryDB from './inMemoryDB'
import type { InMemoryDB } from './inMemoryDB'
import { createServer } from '../server'
import { ApolloServer } from 'apollo-server'

const PORT = 4000

interface QueryAPIProps {
  query: string
  operationName?: string
  variables: any
  userUuid: string
  roles?: string[]
  port?: number
}

/*
 * Helper function for querying the locally-served API. It mocks JWT verification
 * so we can pretend to have an role we want when calling the API.
 */
export const queryAPI = async ({ query, operationName, variables, userUuid, roles = [], port = PORT }: QueryAPIProps): Promise<request.Response> => {
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
  const response = await request(`http://localhost:${port}`)
    .post('/')
    .send(queryObj)
    .set('Authorization', 'Bearer placeholder-jwt-see-SpyOn')

  return response
}

interface SetUpServerReturnType {
  server: ApolloServer
  inMemoryDB: InMemoryDB
}
/*
 * Starts Apollo server and has Mongo inMemory replset connect to it.
*/
export const setUpServer = async (port = PORT): Promise<SetUpServerReturnType> => {
  const server = await createServer()
  await inMemoryDB.connect()
  await server.listen({ port })
  return { server, inMemoryDB }
}
