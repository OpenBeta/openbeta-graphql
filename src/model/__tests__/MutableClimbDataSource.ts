import mongoose from 'mongoose'
import muid from 'uuid-mongodb'
import MutableClimbDataSource, { createInstance as createNewClimbDS } from '../MutableClimbDataSource.js'
import MutableAreaDataSource, { createInstance as createNewAreaDS } from '../MutableAreaDataSource.js'

import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'
import { logger } from '../../logger.js'
import { NewClimbInputType } from '../../db/ClimbTypes.js'

describe('Area history', () => {
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource
  const testUser = muid.v4()

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getClimbModel().collection.drop()

      await createIndexes()
    } catch (e) {
      logger.info('Expected exception')
    }

    climbs = createNewClimbDS()
    areas = createNewAreaDS()
  })

  afterAll(async () => {
    try {
      await mongoose.disconnect()
    } catch (e) {
      console.log('closing mongoose', e)
    }
  })

  it('can add new climbs', async () => {
    await areas.addCountry('usa')
    const newDestination = await areas.addArea(testUser, 'California', null, 'usa')

    if (newDestination == null) fail('Expect new area to be created')

    const routesArea = await areas.addArea(testUser, 'Sport & Trad', newDestination.metadata.area_id)

    if (routesArea == null) fail('Fail to add area for route climbs')

    const newClimbsToAdd: NewClimbInputType[] = [
      {
        name: 'Sport 1',
        disciplines: {
          sport: true
        }
      },
      {
        name: 'Cool trad one',
        disciplines: {
          trad: true
        }
      }
    ]

    const newIDs = await climbs.addClimbs(
      routesArea.metadata.area_id,
      newClimbsToAdd)

    expect(newIDs).toHaveLength(newClimbsToAdd.length)

    const newBoulderProblem: NewClimbInputType = {
      name: 'Cool trad one',
      disciplines: {
        bouldering: true
      }
    }

    // expect error
    await expect(
      climbs.addClimbs(routesArea.metadata.area_id, [newBoulderProblem])
    ).rejects.toThrowError(/Adding boulder problems to a route-only area/)
  })
})
