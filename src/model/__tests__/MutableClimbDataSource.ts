import mongoose from 'mongoose'
import muid from 'uuid-mongodb'
import { ChangeStream } from 'mongodb'

import MutableClimbDataSource from '../MutableClimbDataSource.js'
import MutableAreaDataSource from '../MutableAreaDataSource.js'

import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'
import { logger } from '../../logger.js'
import { ClimbType, ClimbChangeInputType } from '../../db/ClimbTypes.js'
import { sanitizeDisciplines } from '../../GradeUtils.js'
import streamListener from '../../db/edit/streamListener.js'
import { changelogDataSource } from '../ChangeLogDataSource.js'

export const newSportClimb1: ClimbChangeInputType = {
  name: 'Cool route 1',
  disciplines: {
    sport: true
  },
  description: 'A good warm up problem',
  location: 'Start from the left arete',
  protection: '2 bolts',
  boltsCount: 2
}

describe('Climb CRUD', () => {
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource
  let stream: ChangeStream
  const testUser = muid.v4()

  const newClimbsToAdd: ClimbChangeInputType[] = [
    {
      name: 'Sport 1',
      // Intentionally disable TS check to make sure input is sanitized
      disciplines: {
        sport: true
      },
      description: 'The best climb',
      location: '5m left of the big tree',
      protection: '5 quickdraws'
    },
    {
      name: 'Deep water 1',
      disciplines: {
        deepwatersolo: true
      }
    },
    {
      name: 'Cool trad one',
      disciplines: {
        trad: true
      }
    },
    {
      name: 'Icy ice one',
      disciplines: {
        ice: true
      }
    },
    {
      name: 'Cool aid one',
      disciplines: {
        aid: true
      }
    }
  ]

  const newSportClimb2: ClimbChangeInputType = {
    name: 'Cool route 2',
    disciplines: {
      sport: true
    },
    description: 'A local testpiece'
  }

  const newAidRoute: ClimbChangeInputType = {
    name: 'Gnarly Aid',
    disciplines: {
      aid: true
    },
    description: 'certain death',
    grade: 'A0'
  }

  const newBoulderProblem1: ClimbChangeInputType = {
    name: 'Cool boulder 1',
    disciplines: {
      bouldering: true
    },
    description: 'A good warm up problem',
    location: 'Start from the left arete',
    protection: '2 pads'
  }

  const newBoulderProblem2: ClimbChangeInputType = {
    name: 'Cool boulder 2',
    disciplines: {
      bouldering: true
    },
    grade: '5c'
  }

  const newIceRoute: ClimbChangeInputType = {
    name: 'Cool Ice line',
    disciplines: {
      ice: true
    },
    grade: 'WI8+'
  }

  // Define a sport climb with two individual pitches
  const newClimbWithPitches: ClimbChangeInputType = {
    name: 'Short Multi-Pitch',
    disciplines: {
      sport: true
    },
    grade: '7', // max grade of its child pitches
    description: 'A challenging climb with two pitches',
    location: '5m left of the big tree',
    protection: '5 quickdraws',
    pitches: [
      {
        number: 1,
        grades: { uiaa: '7' },
        type: { sport: true },
        length: 30,
        boltsCount: 5,
        description: 'First pitch description'
      },
      {
        number: 2,
        grades: { uiaa: '6+' },
        type: { sport: true },
        length: 40,
        boltsCount: 6,
        description: 'Second pitch description'
      }
    ]
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

    climbs = MutableClimbDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
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

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      routesArea.metadata.area_id,
      newClimbsToAdd)

    expect(newIDs).toHaveLength(newClimbsToAdd.length)

    const climb0 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    // Validate new climb
    expect(climb0).toMatchObject({
      name: newClimbsToAdd[0].name,
      type: sanitizeDisciplines(newClimbsToAdd[0].disciplines),
      content: {
        description: newClimbsToAdd[0].description,
        location: newClimbsToAdd[0].location,
        protection: newClimbsToAdd[0].protection
      }
    })

    // California contains subareas.  Should fail.
    await expect(
      climbs.addOrUpdateClimbs(testUser, newDestination.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/You can only add climbs to a crag/)

    // Route-only area should not accept new boulder problems
    await expect(
      climbs.addOrUpdateClimbs(testUser, routesArea.metadata.area_id, [newBoulderProblem1])
    ).rejects.toThrowError(/Adding boulder problems to a route-only area/)
  })

  it('can add new boulder problems', async () => {
    await areas.addCountry('esp')

    const newDestination = await areas.addArea(testUser, 'Valencia', null, 'esp')
    if (newDestination == null) fail('Expect new area to be created')

    const boulderingArea = await areas.addArea(testUser, 'Bouldering only', newDestination.metadata.area_id)

    expect(boulderingArea.metadata.isBoulder).toBeFalsy()

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      boulderingArea.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    expect(newIDs).toHaveLength(2)

    const newClimb = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    if (newClimb == null) fail('Expecting new boulder problem to be added, but didn\'t find one')
    expect(newClimb.name).toBe(newBoulderProblem1.name)

    // Adding a boulder problem into an empty area will set isBoulder flag
    const updatedArea = await areas.findOneAreaByUUID(boulderingArea.metadata.area_id)
    if (updatedArea == null) fail('Expect area to be non-null')
    expect(updatedArea.metadata.isBoulder).toBeTruthy()
  })

  it('can delete new boulder problems', async () => {
    const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'fr')
    if (newBoulderingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    expect(newIDs).toHaveLength(2)

    // delete a random (non-existing) climb
    const count0 = await climbs.deleteClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [muid.v4()])
    expect(count0).toEqual(0)

    // try delete a correct climb and a non-existent one
    const count1 = await climbs.deleteClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [muid.from(newIDs[0]), muid.v4()])

    // immediately delete a previously deleted climb.  Should be a no op.
    const count2 = await climbs.deleteClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [muid.from(newIDs[0]), muid.v4()])

    expect(count1).toEqual(1)
    expect(count2).toEqual(0)

    // A delay is needed here due to how TTL index works
    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    // make sure the right one is deleted
    let rs = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))
    expect(rs).toBeNull()

    // expect one to remain
    rs = await climbs.findOneClimbByMUUID(muid.from(newIDs[1]))
    if (rs == null) fail('Expect climb 2 to exist')
    expect(rs._id.toUUID().toString()).toEqual(newIDs[1])

    const areaRs = await areas.findOneAreaByUUID(newBoulderingArea.metadata.area_id)
    expect(areaRs.climbs).toHaveLength(1)
    expect((areaRs.climbs[0] as ClimbType)._id.toUUID().toString()).toEqual(newIDs[1])
  })

  it('handles mixed grades and disciplines correctly', async () => {
    await areas.addCountry('can')
    const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'can')
    if (newBoulderingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newBoulderingArea.metadata.area_id,
      [{ ...newBoulderProblem1, grade: 'V3' }, // good grade
        { ...newBoulderProblem2, grade: '5.9' }]) // invalid grade (YDS grade for a boulder problem)

    expect(newIDs).toHaveLength(2)

    const climb1 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))
    expect(climb1?.grades).toEqual({ vscale: 'V3' })

    const climb2 = await climbs.findOneClimbByMUUID(muid.from(newIDs[1]))
    expect(climb2?.grades).toEqual(undefined)
  })

  it('handles Australian grade context correctly', async () => {
    await areas.addCountry('aus')

    {
      // A roped climbing area
      const newClimbingArea = await areas.addArea(testUser, 'Climbing area 1', null, 'aus')
      if (newClimbingArea == null) fail('Expect new area to be created')

      const newclimbs = [
        { ...newSportClimb1, grade: '17' }, // good sport grade
        { ...newSportClimb2, grade: '29/30', disciplines: { trad: true } }, // good trad and slash grade
        { ...newSportClimb2, grade: '5.9' }, // bad AU context grade
        { ...newIceRoute, grade: 'WI4+' }, // good WI AU context grade
        { ...newAidRoute, grade: 'A0' } // good aid grade
      ]

      const newIDs = await climbs.addOrUpdateClimbs(
        testUser,
        newClimbingArea.metadata.area_id,
        newclimbs
      )
      expect(newIDs).toHaveLength(newclimbs.length)

      const climb1 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))
      expect(climb1?.grades).toEqual({ ewbank: '17' })
      expect(climb1?.type.sport).toBe(true)
      expect(newSportClimb1?.boltsCount).toEqual(2)

      const climb2 = await climbs.findOneClimbByMUUID(muid.from(newIDs[1]))
      expect(climb2?.grades).toEqual({ ewbank: '29/30' })
      expect(climb2?.type.sport).toBe(false)
      expect(climb2?.type.trad).toBe(true)

      const climb3 = await climbs.findOneClimbByMUUID(muid.from(newIDs[2]))
      expect(climb3?.grades).toEqual(undefined)

      const climb4 = await climbs.findOneClimbByMUUID(muid.from(newIDs[3]))
      expect(climb4?.grades).toEqual({ wi: 'WI4+' })
      expect(climb4?.type.sport).toBe(false)
      expect(climb4?.type.trad).toBe(false)
      expect(climb4?.type.bouldering).toBe(false)
      expect(climb4?.type.ice).toBe(true)

      const climb5 = await climbs.findOneClimbByMUUID(muid.from(newIDs[4]))
      expect(climb5?.grades).toEqual({ aid: 'A0' })
      expect(climb5?.type.sport).toBe(false)
      expect(climb5?.type.trad).toBe(false)
      expect(climb5?.type.aid).toBe(true)
    }

    {
      // A bouldering area
      const newBoulderingArea = await areas.addArea(testUser, 'Bouldering area 1', null, 'aus')
      if (newBoulderingArea == null) fail('Expect new area to be created')

      const newIDs = await climbs.addOrUpdateClimbs(
        testUser,
        newBoulderingArea.metadata.area_id,
        [{ ...newBoulderProblem1, grade: 'V3' }, // good grade
          { ...newBoulderProblem2, grade: '23' }, // bad boulder grade
          { ...newBoulderProblem2, grade: '7B' }]) // invalid grade (font grade for a AU context boulder problem)

      expect(newIDs).toHaveLength(3)

      const climb1 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))
      expect(climb1?.grades).toEqual({ vscale: 'V3' })

      const climb2 = await climbs.findOneClimbByMUUID(muid.from(newIDs[1]))
      expect(climb2?.grades).toEqual(undefined)

      const climb3 = await climbs.findOneClimbByMUUID(muid.from(newIDs[2]))
      expect(climb3?.grades).toEqual(undefined)
    }
  })

  it('handles UIAA grades correctly', async () => {
    await areas.addCountry('deu') // Assuming Germany since UIAA is dominant grading system

    // A roped climbing area
    const newClimbingArea = await areas.addArea(testUser, 'Climbing area 1', null, 'deu')
    if (newClimbingArea == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newClimbingArea.metadata.area_id,
      [{ ...newSportClimb1, grade: '6+' }, // good UIAA grade
        { ...newSportClimb2, grade: '7-' }, // good UIAA grade
        { ...newSportClimb2, grade: '5' }, // good UIAA grade
        { ...newSportClimb1, grade: 'V6' }]) // bad UIAA grade (V-scale used)

    expect(newIDs).toHaveLength(4)

    const climb1 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))
    expect(climb1?.grades).toEqual({ uiaa: '6+' })

    const climb2 = await climbs.findOneClimbByMUUID(muid.from(newIDs[1]))
    expect(climb2?.grades).toEqual({ uiaa: '7-' })

    const climb3 = await climbs.findOneClimbByMUUID(muid.from(newIDs[2]))
    expect(climb3?.grades).toEqual({ uiaa: '5' })

    const climb4 = await climbs.findOneClimbByMUUID(muid.from(newIDs[3]))
    expect(climb4?.grades).toEqual(undefined)
  })

  it('can update boulder problems', async () => {
    const newDestination = await areas.addArea(testUser, 'Bouldering area A100', null, 'fr')

    if (newDestination == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newDestination.metadata.area_id,
      [newBoulderProblem1, newBoulderProblem2])

    const actual0 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    expect(actual0).toMatchObject({
      name: newBoulderProblem1.name,
      type: sanitizeDisciplines(newBoulderProblem1.disciplines)
    })

    expect(actual0?.createdBy?.toUUID().toString()).toEqual(testUser.toString())
    expect(actual0?.updatedBy).toBeUndefined()

    const changes: ClimbChangeInputType[] = [
      {
        id: newIDs[0],
        name: 'new name A100',
        grade: '6b',
        disciplines: sanitizeDisciplines({ bouldering: true })
      },
      {
        id: newIDs[1],
        name: 'new name A200'
      }
    ]

    const otherUser = muid.v4()

    const updated = await climbs.addOrUpdateClimbs(otherUser, newDestination.metadata.area_id, changes)

    expect(updated).toHaveLength(2)

    const actual1 = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    expect(actual1).toMatchObject({
      name: changes[0].name,
      grades: {
        font: changes[0].grade
      },
      // Make sure update doesn't touch other fields
      type: sanitizeDisciplines(changes[0].disciplines),
      content: {
        description: newBoulderProblem1.description,
        location: newBoulderProblem1.location,
        protection: newBoulderProblem1.protection
      }
    })

    expect(actual1?.createdBy?.toUUID().toString()).toEqual(testUser.toUUID().toString())
    expect(actual1?.updatedBy?.toUUID().toString()).toEqual(otherUser.toUUID().toString())
  })

  it('can update climb length, boltsCount & fa', async () => {
    const newDestination = await areas.addArea(testUser, 'Sport area Z100', null, 'fr')

    if (newDestination == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newDestination.metadata.area_id,
      newClimbsToAdd
    )

    const change: ClimbChangeInputType = {
      id: newIDs[0],
      fa: 'First name Last name, 2023',
      length: 20,
      boltsCount: 5
    }

    await climbs.addOrUpdateClimbs(testUser,
      newDestination.metadata.area_id,
      [change])

    const actual = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    expect(actual?.fa).not.toBeNull()
    expect(actual?.length).not.toBeNull()
    expect(actual?.boltsCount).not.toBeNull()

    expect(actual).toMatchObject({
      fa: change.fa,
      length: change.length,
      boltsCount: change.boltsCount
    })
  })

  it('can add multi-pitch climbs', async () => {
    await areas.addCountry('aut')

    const newDestination = await areas.addArea(testUser, 'Some Location with Multi-Pitch Climbs', null, 'aut')
    if (newDestination == null) fail('Expect new area to be created')

    const routesArea = await areas.addArea(testUser, 'Sport & Trad Multi-Pitches', newDestination.metadata.area_id)

    // create new climb with individual pitches
    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      routesArea.metadata.area_id,
      [newClimbWithPitches]
    )

    expect(newIDs).toHaveLength(1)

    const climb = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    // Validate new climb
    expect(climb).toMatchObject({
      name: newClimbWithPitches.name,
      type: sanitizeDisciplines(newClimbWithPitches.disciplines),
      content: {
        description: newClimbWithPitches.description,
        location: newClimbWithPitches.location,
        protection: newClimbWithPitches.protection
      },
      pitches: newClimbWithPitches.pitches
    })
    // Validate each pitch
    if (climb?.pitches != null) {
      climb.pitches.forEach((pitch) => {
        expect(pitch).toHaveProperty('_id')
        expect(pitch).toHaveProperty('parentId')
        expect(pitch).toHaveProperty('number')
      })
    } else {
      fail('Pitches are missing either of required attributes id, parentId, number')
    }
  })

  it('can update multi-pitch problems', async () => {
    const newDestination = await areas.addArea(testUser, 'Some Multi-Pitch Area to be Updated', null, 'deu')

    if (newDestination == null) fail('Expect new area to be created')

    const newIDs = await climbs.addOrUpdateClimbs(
      testUser,
      newDestination.metadata.area_id,
      [newClimbWithPitches]
    )

    // Fetch the original climb
    const original = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    // Check if 'original' is not null before accessing its properties
    if ((original == null) || (original.pitches == null) || original.pitches.length < 2) {
      fail('Original climb is null or does not have at least two pitches (as defined in the test case)')
      return
    }

    // Store original pitch IDs and parent IDs
    const originalPitch1ID = original.pitches[0]._id.toUUID().toString()
    const originalPitch2ID = original.pitches[1]._id.toUUID().toString()
    const originalPitch1ParentID = original.pitches[0].parentId
    const originalPitch2ParentID = original.pitches[1].parentId

    // Define updated pitch info
    const updatedPitch1 = {
      id: originalPitch1ID,
      parentId: originalPitch1ParentID,
      number: 1,
      grades: { ewbank: '19' },
      type: { sport: false, alpine: true },
      length: 20,
      boltsCount: 6,
      description: 'Updated first pitch description'
    }

    const updatedPitch2 = {
      id: originalPitch2ID,
      parentId: originalPitch2ParentID,
      number: 2,
      grades: { ewbank: '18' },
      type: { sport: false, alpine: true },
      length: 25,
      boltsCount: 5,
      description: 'Updated second pitch description'
    }

    const changes: ClimbChangeInputType[] = [
      {
        id: newIDs[0],
        pitches: [updatedPitch1, updatedPitch2]
      }
    ]

    // update climb
    await climbs.addOrUpdateClimbs(testUser, newDestination.metadata.area_id, changes)

    // Fetch the updated climb
    const updatedClimb = await climbs.findOneClimbByMUUID(muid.from(newIDs[0]))

    if (updatedClimb != null) {
      // Check that the pitches.id and pitches.parentId are identical to the original values
      if (updatedClimb.pitches != null) {
        const assertPitch = (
          pitch,
          expectedPitch,
          originalID,
          originalParentID
        ): void => {
          expect(pitch._id.toUUID().toString()).toEqual(originalID)
          expect(pitch.parentId).toEqual(originalParentID)
          expect(pitch.number).toEqual(expectedPitch.number)
          expect(pitch.grades).toEqual(expectedPitch.grades)
          expect(pitch.type).toEqual(expectedPitch.type)
          expect(pitch.length).toEqual(expectedPitch.length)
          expect(pitch.boltsCount).toEqual(expectedPitch.boltsCount)
          expect(pitch.description).toEqual(expectedPitch.description)
        }

        assertPitch(updatedClimb.pitches[0], updatedPitch1, originalPitch1ID, originalPitch1ParentID)
        assertPitch(updatedClimb.pitches[1], updatedPitch2, originalPitch2ID, originalPitch2ParentID)
      }

      // Check that the createdBy and updatedBy fields are not undefined before accessing their properties
      if ((updatedClimb.createdBy != null) && (updatedClimb.updatedBy != null)) {
        expect(updatedClimb.createdBy.toUUID().toString()).toEqual(testUser.toString())
        expect(updatedClimb.updatedBy.toUUID().toString()).toEqual(testUser.toString())
      } else {
        fail('createdBy or updatedBy is undefined')
      }
    }
  })
})
