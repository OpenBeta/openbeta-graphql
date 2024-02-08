import {ApolloServer} from 'apollo-server-express'
import muuid from 'uuid-mongodb'
import {jest} from '@jest/globals'
import MutableAreaDataSource from '../model/MutableAreaDataSource.js'
import MutableOrganizationDataSource from '../model/MutableOrganizationDataSource.js'
import MutableClimbDataSource from '../model/MutableClimbDataSource.js'
import {AreaType} from '../db/AreaTypes.js'
import {OrganizationType, OrgType} from '../db/OrganizationTypes.js'
import {muuidToString} from '../utils/helpers.js'
import {queryAPI, setUpServer} from '../utils/testUtils.js'
import {InMemoryDB} from "../utils/inMemoryDB.js";
import express from "express";

jest.setTimeout(60000)

describe('history API', () => {
  let server: ApolloServer
  let user: muuid.MUUID
  let userUuid: string
  let app: express.Application
  let inMemoryDB: InMemoryDB

  // Mongoose models for mocking pre-existing state.
  let areas: MutableAreaDataSource
  let organizations: MutableOrganizationDataSource
  let climbs: MutableClimbDataSource

  beforeAll(async () => {
    ({server, inMemoryDB, app} = await setUpServer())
    // Auth0 serializes uuids in "relaxed" mode, resulting in this hex string format
    // "59f1d95a-627d-4b8c-91b9-389c7424cb54" instead of base64 "WfHZWmJ9S4yRuTicdCTLVA==".
    user = muuid.mode('relaxed').v4()
    userUuid = muuidToString(user)
  })

  beforeEach(async () => {
    await inMemoryDB.clear()
    areas = MutableAreaDataSource.getInstance()
    organizations = MutableOrganizationDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
  })

  afterAll(async () => {
    await server.stop()
    await inMemoryDB.close()
  })

  describe('queries', () => {
    const FRAGMENT_CHANGE_HISTORY = `
      fragment ChangeHistoryFields on History {
        id
        createdAt
        operation
        editedBy
        changes {
          dbOp
          changeId
          updateDescription {
            updatedFields
          }
          fullDocument {
            ... on Area {
              areaName
              uuid
              metadata {
                leaf
                areaId
              }
            }
            ... on Climb {
              id
              name
              uuid
            }
            ... on Organization {
              orgId
            }
          }
        }
      }
    `

    const QUERY_RECENT_CHANGE_HISTORY = `
      ${FRAGMENT_CHANGE_HISTORY}
      query ($filter: AllHistoryFilter) {
        getChangeHistory(filter: $filter) {
          ...ChangeHistoryFields
        }
      }
    `

    let usa: AreaType
    let ca: AreaType
    let alphaOrg: OrganizationType
    let climbIds: string[]

    it('queries recent change history successfully', async () => {
      // Make changes to be tracked.
      usa = await areas.addCountry('usa')
      ca = await areas.addArea(user, 'CA', usa.metadata.area_id)
      const alphaFields = {
        displayName: 'Alpha OpenBeta Club',
        associatedAreaIds: [usa.metadata.area_id],
        email: 'admin@alphaopenbeta.com'
      }
      alphaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, alphaFields)
      climbIds = await climbs.addOrUpdateClimbs(user, ca.metadata.area_id, [{name: 'Alpha Climb'}])

      // Query for changes and ensure they are tracked.
      const resp = await queryAPI({
        query: QUERY_RECENT_CHANGE_HISTORY,
        variables: {filter: {}},
        userUuid,
        app
      })
      expect(resp.statusCode).toBe(200)
      const histories = resp.body.data.getChangeHistory
      expect(histories.length).toBe(3)

      // Latest change first
      // Note: addCountry is not captured by history.
      const [climbChange, orgChange, areaChange] = histories

      expect(climbChange.operation).toBe('updateClimb')
      expect(climbChange.editedBy).toBe(userUuid)

      /**
       * Four changes (Ordering is non-deterministic)
       * 1. Insert the climb
       * 2. Update the parent area
       * 3. Update aggregate object on crag
       * 4. Update the parent area
       */
      expect(climbChange.changes.length).toBe(4)
      const insertChange = climbChange.changes.filter(c => c.dbOp === 'insert')[0]
      const updateChange = climbChange.changes.filter(c => c.dbOp === 'update')[0]
      expect(insertChange.fullDocument.uuid).toBe(climbIds[0])
      expect(updateChange.fullDocument.uuid).toBe(muuidToString(ca.metadata.area_id))

      expect(orgChange.operation).toBe('addOrganization')
      expect(orgChange.editedBy).toBe(userUuid)
      expect(orgChange.changes[0].fullDocument.orgId).toBe(muuidToString(alphaOrg.orgId))

      expect(areaChange.operation).toBe('addArea')
      expect(areaChange.editedBy).toBe(userUuid)
    })
  })
})
