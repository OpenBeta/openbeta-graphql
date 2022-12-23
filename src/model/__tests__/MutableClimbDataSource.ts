import mongoose from 'mongoose'
import muid from 'uuid-mongodb'
import { ChangeStream } from 'mongodb'

import MutableClimbDataSource, { createInstance as createNewClimbDS } from '../MutableClimbDataSource.js'
import MutableAreaDataSource, { createInstance as createNewAreaDS } from '../MutableAreaDataSource.js'

import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'
import { logger } from '../../logger.js'
import { ClimbChangeDocType, ClimbChangeInputType } from '../../db/ClimbTypes.js'
import { sanitizeDisciplines } from '../../GradeUtils.js'
import streamListener from '../../db/edit/streamListener.js'
import { changelogDataSource } from '../ChangeLogDataSource.js'

describe('Climb CRUD', () => {
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource
  let stream: ChangeStream
  const testUser = muid.v4()

  const newClimbsToAdd: ClimbChangeDocType[] = [
    {
      name: 'Sport 1',
      // Intentionally disable TS check to make sure input is sanitized
      // @ts-expect-error
      disciplines: {
        sport: true
      }
    },
    {
      name: 'Cool trad one',
      // @ts-expect-error
      disciplines: {
        trad: true
      }
    }
  ]

  const newBoulderProblem1: ClimbChangeInputType = {
    name: 'Cool boulder 1',
    // @ts-expect-error
    disciplines: {
      bouldering: true
    }
  }

  const newBoulderProblem2: ClimbChangeInputType = {
    name: 'Cool boulder 2',
    // @ts-expect-error
    disciplines: {
      bouldering: true
    },
    grade: '5c'
  }

  beforeAll(async () => {
    await connectDB()
    stream = await streamListener()

    try {
      await getAreaModel().collection.drop()
      await getClimbModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    await createIndexes()

    climbs = createNewClimbDS()
    areas = createNewAreaDS()
    await changelogDataSource._testRemoveAll()
    await areas.addCountry('fr')
  })

  afterAll(async () => {
    try {
      await stream.close()
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
      testUser,
      routesArea.metadata.area_id,
      newClimbsToAdd)

    expect(newIDs).toHaveLength(newClimbsToAdd.length)

    // California contains subareas.  Should fail.
    await expect(
      climbs.addClimbs(testUser, newDestination.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/You can only add climbs to a crag/)

    // Route-only area should not accept new boulder problems
    await expect(
      climbs.addClimbs(testUser, routesArea.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/Adding boulder problems to a route-only area/)
  })

  it('can add new boulder problems', async () => {
    await areas.addCountry('esp')

    const newDestination = await areas.addArea(testUser, 'Valencia', null, 'esp')
    if (newDestination == null) fail('Expect new area to be created')

    const boulderingArea = await areas.addArea(testUser, 'Bouldering only', newDestination.metadata.area_id)

    expect(boulderingArea.metadata.isBoulder).toBeFalsy()

    const newIDs = await climbs.addClimbs(
      testUser,
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
    const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'fr')
    if (newBoulderingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    expect(newIDs).toHaveLength(2)

    // delete a non-existing climb
    const count0 = await climbs.deleteClimbs(testUser, [muid.v4().toUUID().toString()])
    expect(count0).toEqual(0)

    // try delete a correct climb and a non-existent one
    const count1 = await climbs.deleteClimbs(
      testUser,
      [newIDs[0].toUUID().toString(), muid.v4().toUUID().toString()])

    // immediately delete a previously deleted climb.  Should be a no op.
    const count2 = await climbs.deleteClimbs(
      testUser,
      [newIDs[0].toUUID().toString(), muid.v4().toUUID().toString()])

    expect(count1).toEqual(1)
    expect(count2).toEqual(0)

    // A delay is needed here due to how TTL index works
    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    // make sure the right one is deleted
    let rs = await climbs.findOneClimbByMUUID(newIDs[0])
    expect(rs).toBeNull()

    // expect one to remain
    rs = await climbs.findOneClimbByMUUID(newIDs[1])
    if (rs == null) fail('Expect climb 2 to exist')
  })

  it('handles grades correctly', async () => {
    await areas.addCountry('can')
    const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'can')
    if (newBoulderingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [{ ...newBoulderProblem1, grade: 'V3' }, // good grade
        { ...newBoulderProblem2, grade: '5.9' }]) // invalid grade (YDS grade for a boulder problem)

    expect(newIDs).toHaveLength(2)

    const climb1 = await climbs.findOneClimbByMUUID(newIDs[0])
    expect(climb1?.grades).toEqual({ vscale: 'V3' })

    const climb2 = await climbs.findOneClimbByMUUID(newIDs[1])
    expect(climb2?.grades).toEqual(undefined)
  })

  it('can update boulder problems', async () => {
    const newDestination = await areas.addArea(testUser, 'Bouldering area A100', null, 'fr')

    if (newDestination == null) fail('Expect new area to be created')

    const newIDs = await climbs.addClimbs(
      testUser,
      newDestination.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    const changes: ClimbChangeInputType[] = [
      {
        id: newIDs[0].toUUID().toString(),
        name: 'new name A100',
        grade: '6b',
        disciplines: sanitizeDisciplines({ bouldering: true })
      },
      {
        id: newIDs[1].toUUID().toString(),
        name: 'new name A200'
      }
    ]

    const otherUser = muid.v4()
    const updated = await climbs.updateClimbs(otherUser, newDestination.metadata.area_id, changes)

    expect(updated).toHaveLength(2)

    const actual1 = await climbs.findOneClimbByMUUID(newIDs[0])

    expect(actual1).toMatchObject({
      name: changes[0].name,
      grades: {
        font: changes[0].grade
      },
      type: sanitizeDisciplines(changes[0].disciplines),
      createdBy: testUser.toUUID(),
      updatedBy: otherUser.toUUID()
    })
  })
})
