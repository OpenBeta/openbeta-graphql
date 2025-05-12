import muuid from 'uuid-mongodb'
import exampleImportData from '../../__tests__/import-example.json' assert {type: 'json'}
import { BulkImportResultType } from '../../db/BulkImportTypes.js'
import { gqlTest } from '../../__tests__/fixtures/gql.fixtures.js'
import { muuidToString } from '../../utils/helpers'

interface LocalContext {
  importData: typeof exampleImportData
}

const it = gqlTest.extend<LocalContext>({
  importData: async ({ country }, use) => await use(
    {
      areas: exampleImportData.areas.map(x => {
        if (x.countryCode !== undefined && x.countryCode !== '') {
          return { ...x, countryCode: country.shortCode }
        }

        return { ...x }
      }) as typeof exampleImportData['areas']
    })
})

describe('bulkImportAreas', () => {
  const bulkQuery = `
    mutation bulkImportAreas($input: BulkImportInput!) {
      bulkImportAreas(input: $input) {
        addedAreas {
          uuid
          metadata {
            area_id
          }
        }
        updatedAreas {
          uuid
          metadata {
            area_id
          }
        }
        addedOrUpdatedClimbs {
          id
        }
      }
    }
  `

  it('should return 403 if no user', async ({ query, importData }) => {
    const res = await query({
      query: bulkQuery,
      operationName: 'bulkImportAreas',
      variables: { input: importData }
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors[0].message).toBe('Not Authorised!')
  })

  it('should return 403 if user is not an editor', async ({ query, userUuid, importData }) => {
    const res = await query({
      userUuid,
      query: bulkQuery,
      operationName: 'bulkImportAreas',
      variables: { input: importData }
    })
    expect(res.statusCode).toBe(200)
    expect(res.body.errors[0].message).toBe('Not Authorised!')
  })

  it('should return 200 if user is an editor', async ({ query, importData, userUuid }) => {
    const res = await query({
      userUuid,
      roles: ['editor'],
      query: bulkQuery,
      operationName: 'bulkImportAreas',
      variables: { input: importData }
    })
    expect(res.status).toBe(200)
  })

  it('should import data', async ({ query, userUuid, area, bulkImport, climbs, importData }) => {
    const res = await query({
      userUuid,
      roles: ['editor'],
      query: bulkQuery,
      operationName: 'bulkImportAreas',
      variables: {
        input: {
          areas: [
            ...importData.areas,
            {
              uuid: muuidToString(area.metadata.area_id),
              areaName: 'Updated Test Area'
            }
          ]
        }
      }
    })
    expect(res.body.errors).toBeFalsy()

    const result = res.body.data.bulkImportAreas as BulkImportResultType
    expect(result.addedAreas.length).toBe(4)

    const committedAreas = await Promise.all(result.addedAreas.map(async (area) => await bulkImport.findOneAreaByUUID(muuid.from(area.metadata.area_id))))
    expect(committedAreas.length).toBe(4)

    const committedClimbs = await Promise.all(result.addedOrUpdatedClimbs.map(async (climb) => await climbs.findOneClimbByMUUID(climb._id)))
    expect(committedClimbs.length).toBe(2)

    const updatedAreas = await Promise.all(result.updatedAreas.map(async (area) => await bulkImport.findOneAreaByUUID(muuid.from(area.metadata.area_id))))
    expect(updatedAreas.length).toBe(1)
    expect(updatedAreas[0].area_name).toBe('Updated Test Area')
  })
})
