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

  const newBoulderProblem1: NewClimbInputType = {
    name: 'Cool boulder 1',
    disciplines: {
      bouldering: true
    }
  }

  const newBoulderProblem2: NewClimbInputType = {
    name: 'Cool boulder 2',
    disciplines: {
      bouldering: true
    }
  }

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getClimbModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    await createIndexes()

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
    const newIDs = await climbs.addClimbs(
      routesArea.metadata.area_id,
      newClimbsToAdd)

    expect(newIDs).toHaveLength(newClimbsToAdd.length)

    // California contains subareas.  Should fail.
    await expect(
      climbs.addClimbs(newDestination.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/You can only add climbs to a crag/)

    // Route-only area should not accept new boulder problems
    await expect(
      climbs.addClimbs(routesArea.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/Adding boulder problems to a route-only area/)
  })

  it('can add new boulder problems', async () => {
    await areas.addCountry('esp')

    const newDestination = await areas.addArea(testUser, 'Valencia', null, 'esp')
    if (newDestination == null) fail('Expect new area to be created')

    const boulderingArea = await areas.addArea(testUser, 'Bouldering only', newDestination.metadata.area_id)

    expect(boulderingArea.metadata.isBoulder).toBeFalsy()

    const newIDs = await climbs.addClimbs(
      boulderingArea.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    expect(newIDs).toHaveLength(2)

    const newClimb = await climbs.findOneClimbByMUUID(newIDs[0])

    if (newClimb == null) fail('Expecting new boulder problem to be added, but didn\'t find one')
    expect(newClimb.name).toBe(newBoulderProblem1.name)

    // Adding a boulder problem into an empty area will set isBoulder flag
    const updatedArea = await areas.findOneAreaByUUID(boulderingArea.metadata.area_id)
    expect(updatedArea.metadata.isBoulder).toBeTruthy()
  })

  it('can delete new boulder problems', async () => {
    await areas.addCountry('can')
    const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'can')
    if (newBoulderingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addClimbs(
      newBoulderingArea.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    expect(newIDs).toHaveLength(2)

    await climbs.deleteClimbs(testUser, [newIDs[0].toUUID().toString()])

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))
    let rs = await climbs.findOneClimbByMUUID(newIDs[0])
    expect(rs).toBeNull()

    rs = await climbs.findOneClimbByMUUID(newIDs[1])
    if (rs == null) fail('Expect climb2 to exist')
  })
})
