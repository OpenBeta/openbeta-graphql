import jwt from 'jsonwebtoken'
import { jest } from '@jest/globals'
import request from 'supertest'
import type { InMemoryDB } from './inMemoryDB.js'
import inMemoryDB from './inMemoryDB.js'
import { createServer } from '../server.js'
import { ApolloServer } from 'apollo-server-express'
import express from 'express'

const PORT = 4000

export interface QueryAPIProps {
  query?: string
  operationName?: string
  variables?: any
  userUuid?: string
  roles?: string[]
  port?: number
  endpoint?: string
  app?: express.Application
  body?: any
}

/*
 * Helper function for querying the locally-served API. It mocks JWT verification
 * so we can pretend to have an role we want when calling the API.
 */
export const queryAPI = async ({
  query,
  operationName,
  variables,
  userUuid = '',
  roles = [],
  app,
  endpoint = '/',
  port = PORT
}: QueryAPIProps): Promise<request.Response> => {
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
  return await request(app ?? `http://localhost:${port}`)
    .post(endpoint)
    .send(queryObj)
    .set('Authorization', 'Bearer placeholder-jwt-see-SpyOn')
}

export interface SetUpServerReturnType {
  server: ApolloServer
  app: express.Application
  inMemoryDB: InMemoryDB
}

/*
 * Starts Apollo server and has Mongo inMemory replset connect to it.
*/
export const setUpServer = async (): Promise<SetUpServerReturnType> => {
  await inMemoryDB.connect()
  const { app, server } = await createServer()
  return { app, server, inMemoryDB }
}

export const isFulfilled = <T>(
  p: PromiseSettledResult<T>
): p is PromiseFulfilledResult<T> => p.status === 'fulfilled'
export const isRejected = <T>(
  p: PromiseSettledResult<T>
): p is PromiseRejectedResult => p.status === 'rejected'
