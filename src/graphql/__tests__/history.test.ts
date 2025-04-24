import mongoose from 'mongoose'
import { OrgType } from '../../db/OrganizationTypes.js'
import { muuidToString } from '../../utils/helpers.js'
import { gqlTest as it } from '../../__tests__/fixtures/gql.fixtures.js'
import muuid from 'uuid-mongodb'

describe('history API', () => {
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

    it('queries recent change history successfully', async ({ user, userUuid, query, climbs, organizations, area, country, waitForChanges }) => {
      // Make changes to be tracked.
      const alphaFields = {
        displayName: 'Alpha OpenBeta Club',
        associatedAreaIds: [country.metadata.area_id],
        email: 'admin@alphaopenbeta.com'
      }

      const alphaOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, alphaFields)
      const climbIds = await waitForChanges({ document: area }, async () => await climbs.addOrUpdateClimbs(user, area.metadata.area_id, [{ name: 'Alpha Climb' }]))

      // Query for changes and ensure they are tracked.
      const resp = await query({
        query: QUERY_RECENT_CHANGE_HISTORY,
        variables: { filter: {} },
        userUuid
      })

      expect(resp.statusCode).toBe(200)
      const histories = resp.body.data.getChangeHistory

      const climb = await climbs.findOneClimbByMUUID(muuid.from(climbIds[0]))

      assert(climb)
      assert(climb?._change?.historyId)
      assert(area._change?.historyId)
      assert(alphaOrg._change?.historyId)

      const areaChange = histories.find(item => area._change?.historyId.equals(new mongoose.Types.ObjectId(item.id)))
      const orgChange = histories.find(item => alphaOrg._change?.historyId.equals(new mongoose.Types.ObjectId(item.id)))
      const climbChange = histories.find(item => climb?._change?.historyId.equals(new mongoose.Types.ObjectId(item.id)))

      assert(climbChange)
      assert(orgChange)
      assert(areaChange)

      expect(climbChange.editedBy).toBe(userUuid)

      /**
       * Four changes (Ordering is non-deterministic)
       * 1. Insert the climb
       * 2. Update the parent area
       * 3. Update aggregate object on crag
       * 4. Update the parent area
       */
      const insertChange = climbChange.changes.filter(c => c.dbOp === 'insert')[0]
      const updateChange = climbChange.changes.filter(c => c.dbOp === 'update')[0]

      expect(insertChange).toBeTruthy()
      expect(insertChange.fullDocument).toBeTruthy()
      expect(insertChange.fullDocument.uuid).toBeTruthy()

      expect(insertChange.fullDocument.uuid).toBe(climbIds[0])
      expect(updateChange.fullDocument.uuid).toBe(muuidToString(area.metadata.area_id))

      expect(orgChange.operation).toBe('addOrganization')
      expect(orgChange.editedBy).toBe(userUuid)
      expect(orgChange.changes[0].fullDocument.orgId).toBe(muuidToString(alphaOrg.orgId))

      expect(areaChange.operation).toBe('addArea')
      expect(areaChange.editedBy).toBe(userUuid)
    })
  })
})
