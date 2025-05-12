import { AreaType } from '../../db/AreaTypes.js'
import { ClimbType } from '../../db/ClimbTypes.js'
import { isFulfilled } from '../../utils/testUtils.js'
import { BulkImportAreaInputType, BulkImportResultType } from '../../db/BulkImportTypes.js'
import { dataFixtures } from '../../__tests__/fixtures/data.fixtures.js'

interface LocalContext {
  assertBulkImport: (...input: BulkImportAreaInputType[]) => Promise<BulkImportResultType>
}

const it = dataFixtures.extend<LocalContext>({
  assertBulkImport: async ({ climbs, user, bulkImport }, use) => {
    const assertBulkImport = async (...input: BulkImportAreaInputType[]): Promise<BulkImportResultType> => {
      const result = await bulkImport.bulkImport({
        user,
        input: { areas: input },
        climbs
      })

      const addedAreas = await Promise.allSettled(
        result.addedAreas.map(async (area) =>
          await bulkImport.findOneAreaByUUID(area.metadata.area_id)
        )
      )
      const updatedAreas = await Promise.allSettled(
        result.updatedAreas.map(async (area) =>
          await bulkImport.findOneAreaByUUID(area.metadata.area_id)
        )
      )
      const addedOrUpdatedClimbs = await Promise.allSettled(
        result.addedOrUpdatedClimbs.map(async (climb) => await climbs.findOneClimbByMUUID(climb._id))
      )

      return {
        addedAreas: addedAreas.filter(isFulfilled).map((p) => p.value),
        updatedAreas: updatedAreas.filter(isFulfilled).map((p) => p.value),
        addedOrUpdatedClimbs: addedOrUpdatedClimbs.filter(isFulfilled).map((p) => p.value as ClimbType)
      }
    }
    await use(assertBulkImport)
  }
})

describe('bulk import e2e', () => {
  describe('adding new areas and climbs', () => {
    it('should commit a new minimal area to the database', async ({ assertBulkImport, country }) => {
      await expect(
        assertBulkImport({
          areaName: 'Minimal Area',
          countryCode: country.shortCode
        })
      ).resolves.toMatchObject({
        addedAreas: [
          {
            area_name: 'Minimal Area',
            gradeContext: country.gradeContext,
            metadata: {
              leaf: false,
              isBoulder: false
            }
          }
        ]
      })
    })

    it('should rollback when one of the areas fails to import', async ({ assertBulkImport, country }) => {
      await expect(
        assertBulkImport(
          {
            areaName: 'Test Area',
            countryCode: country.shortCode
          },
          {
            areaName: 'Test Area 2'
          }
        )
      ).rejects.toThrowError('Must provide parent Id or country code')
    })

    it('should import nested areas with children', async ({ assertBulkImport, country }) => {
      await expect(
        assertBulkImport({
          areaName: 'Parent Area',
          countryCode: country.shortCode,
          children: [
            {
              areaName: 'Child Area 2'
            }
          ]
        })
      ).resolves.toMatchObject({
        addedAreas: [
          { area_name: 'Parent Area', gradeContext: country.gradeContext },
          { area_name: 'Child Area 2', gradeContext: country.gradeContext }
        ] as Array<Partial<AreaType>>
      })
    })

    it('should import nested areas with children and grandchildren', async ({ assertBulkImport, country }) => {
      await expect(
        assertBulkImport({
          areaName: 'Test Area',
          countryCode: country.shortCode,
          children: [
            {
              areaName: 'Test Area 2',
              children: [
                {
                  areaName: 'Test Area 3'
                }
              ]
            }
          ]
        })
      ).resolves.toMatchObject({
        addedAreas: [
          {
            area_name: 'Test Area',
            pathTokens: [country.area_name, 'Test Area']
          },
          {
            area_name: 'Test Area 2',
            pathTokens: [
              country.area_name,
              'Test Area',
              'Test Area 2'
            ]
          },
          {
            area_name: 'Test Area 3',
            pathTokens: [
              country.area_name,
              'Test Area',
              'Test Area 2',
              'Test Area 3'
            ]
          }
        ] as Array<Partial<AreaType>>
      })
    })

    it('should import leaf areas with climbs', async ({ assertBulkImport, country }) => {
      await expect(
        assertBulkImport({
          areaName: 'Test Area',
          countryCode: country.shortCode,
          climbs: [
            {
              name: 'Test Climb',
              grade: '5.10a',
              disciplines: { sport: true }
            }
          ]
        })
      ).resolves.toMatchObject({
        addedAreas: [
          {
            area_name: 'Test Area',
            gradeContext: country.gradeContext,
            metadata: {
              leaf: true,
              isBoulder: false
            },
            climbs: [{
              name: 'Test Climb',
              grades: {
                yds: '5.10a'
              }
            }]
          }
        ],
        addedOrUpdatedClimbs: [
          {
            name: 'Test Climb',
            grades: {
              yds: '5.10a'
            }
          }
        ]
      })
    })
  })

  describe('updating existing areas', () => {
    it('should update an existing area', async ({ assertBulkImport, area }) => {
      await expect(
        assertBulkImport({
          uuid: area.metadata.area_id,
          areaName: 'New Name'
        })
      ).resolves.toMatchObject({
        updatedAreas: [{ area_name: 'New Name' }]
      })
    })
  })
})
