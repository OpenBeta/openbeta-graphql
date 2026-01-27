import muuid from 'uuid-mongodb'
import { getAreaModel, getChangeLogModel, createIndexes } from '../../db/index.js'
import ChangeLogDataSource from '../ChangeLogDataSource.js'
import { OperationType } from '../../db/AreaTypes.js'
import MutableAreaDataSource from '../MutableAreaDataSource.js'
import AreaDataSource from '../AreaDataSource.js'
import inMemoryDB from '../../utils/inMemoryDB.js'

describe('Pagination tests', () => {
  let changeLog: ChangeLogDataSource
  let areas: AreaDataSource
  const testUser = muuid.v4()

  beforeAll(async () => {
    await inMemoryDB.connect()
    try {
      await getAreaModel().collection.drop()
      await getChangeLogModel().collection.drop()
    } catch (e) {
      // Collections may not exist yet
    }
    await createIndexes()
    changeLog = ChangeLogDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
  })

  afterAll(async () => {
    await inMemoryDB.close()
  })

  describe('History pagination', () => {
    beforeAll(async () => {
      // Create multiple change records for testing pagination
      for (let i = 0; i < 10; i++) {
        const session = await getChangeLogModel().startSession()
        await changeLog.create(session, testUser, OperationType.addCountry)
        await session.endSession()
      }
    })

    it('should return limited results with limit parameter', async () => {
      const results = await changeLog.getChangeSets([], 5, 0)
      expect(results.length).toBe(5)
    })

    it('should skip results with offset parameter', async () => {
      const allResults = await changeLog.getChangeSets([], 10, 0)
      const offsetResults = await changeLog.getChangeSets([], 10, 5)

      expect(offsetResults.length).toBe(5)
      // Verify offset worked - first item of offset results should match 6th item of all results
      expect(offsetResults[0]._id.toString()).toBe(allResults[5]._id.toString())
    })

    it('should handle limit + offset together', async () => {
      const results = await changeLog.getChangeSets([], 3, 2)
      expect(results.length).toBe(3)
    })

    it('should use default limit when not specified', async () => {
      const results = await changeLog.getChangeSets([])
      expect(results.length).toBeLessThanOrEqual(50) // Default limit is 50
    })
  })

  describe('Area pagination', () => {
    beforeAll(async () => {
      // Create a country (using valid ISO code) and multiple child areas
      const country = await MutableAreaDataSource.getInstance().addCountry('USA')
      for (let i = 0; i < 15; i++) {
        await MutableAreaDataSource.getInstance().addArea(
          testUser,
          `TestArea${i}`,
          country.metadata.area_id
        )
      }
    })

    it('should paginate bulkDownloadAreas with limit', async () => {
      // First get all areas to know what we're working with
      const allAreas = await areas.findDescendantsByPathPaginated('', 100, 0)

      // Now test pagination
      const limitedResults = await areas.findDescendantsByPathPaginated('', 5, 0)
      expect(limitedResults.length).toBe(5)
    })

    it('should paginate bulkDownloadAreas with offset', async () => {
      const page1 = await areas.findDescendantsByPathPaginated('', 5, 0)
      const page2 = await areas.findDescendantsByPathPaginated('', 5, 5)

      // Ensure different results
      expect(page1[0]._id.toString()).not.toBe(page2[0]._id.toString())
    })
  })
})
