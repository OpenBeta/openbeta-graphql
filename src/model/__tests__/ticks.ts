import { produce } from 'immer'
import TickDataSource from '../TickDataSource.js'
import { getTickModel, getUserModel } from '../../db/index.js'
import { TickInput } from '../../db/TickTypes.js'
import muuid from 'uuid-mongodb'
import UserDataSource from '../UserDataSource.js'
import { UpdateProfileGQLInput } from '../../db/UserTypes.js'
import inMemoryDB from '../../utils/inMemoryDB.js'
import { ClimbChangeInputType } from '../../db/ClimbTypes.js'
import MutableClimbDataSource from '../MutableClimbDataSource.js'
import MutableAreaDataSource from '../MutableAreaDataSource.js'

const userId = muuid.v4()
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
  }
]

const toTest: TickInput = {
  name: 'Small Dog',
  notes: 'Sandbagged',
  climbId: 'tbd', // need to create a climb for tick validation
  userId: userId.toUUID().toString(),
  style: 'Lead',
  attemptType: 'Onsight',
  dateClimbed: new Date('2012-12-12'),
  grade: '5.7',
  source: 'MP'
}

const toTest2: TickInput = {
  name: 'Sloppy Peaches',
  notes: 'v sloppy',
  climbId: 'tbd',
  userId: userId.toUUID().toString(),
  style: 'Lead',
  attemptType: 'Flash',
  dateClimbed: new Date('2012-10-15'),
  grade: '5.10',
  source: 'MP'
}

let tickUpdate: TickInput = produce(toTest, draft => {
  draft.notes = 'Not sandbagged'
  draft.attemptType = 'Flash'
  draft.source = 'OB'
})

const testImport: TickInput[] = [
  toTest, toTest2, tickUpdate
]

describe('Ticks', () => {
  let ticks: TickDataSource
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource
  const tickModel = getTickModel()

  let users: UserDataSource

  beforeAll(async () => {
    console.log('#BeforeAll Ticks')
    await inMemoryDB.connect()

    try {
      await getTickModel().collection.drop()
      await getUserModel().collection.drop()
    } catch (e) {
      console.log('Cleaning db')
    }

    ticks = TickDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
    users = UserDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
    // Add climbs because add/update tick requires type validation
    await areas.addCountry('usa')
    const newDestination = await areas.addArea(userId, 'California', null, 'usa')
    if (newDestination == null) fail('Expect new area to be created')

    const routesArea = await areas.addArea(userId, 'Sport & Trad', newDestination.metadata.area_id)

    const newIDs = await climbs.addOrUpdateClimbs(userId, routesArea.metadata.area_id, newClimbsToAdd)

    // Update tick inputs with generated climb IDs
    toTest.climbId = newIDs[0]
    toTest2.climbId = newIDs[1]
    tickUpdate = { ...tickUpdate, climbId: newIDs[0] } // Ensure tickUpdate has the correct climbId
  })

  afterAll(async () => {
    await inMemoryDB.close()
  })

  afterEach(async () => {
    await getTickModel().collection.drop()
    await tickModel.ensureIndexes()
  })

  // test adding tick
  it('should create a new tick for the associated climb', async () => {
    const tick = await ticks.addTick(toTest)
    const newTick = await tickModel.findOne({ userId: toTest.userId })
    expect(newTick?._id).toEqual(tick._id)
  })

  // test updating tick
  it('should update a tick and return the proper information', async () => {
    const tick = await ticks.addTick(toTest)

    if (tick == null) {
      fail('Tick should not be null')
    }
    const newTick = await ticks.editTick({ _id: tick._id }, tickUpdate)

    if (newTick == null) {
      fail('The new tick should not be null')
    }
    expect(newTick?._id).toEqual(tick._id)
    expect(newTick?.notes).toEqual(tickUpdate.notes)
    expect(newTick?.attemptType).toEqual(tickUpdate.attemptType)
  })

  // test removing tick
  it('should remove a tick', async () => {
    const tick = await ticks.addTick(toTest)

    if (tick == null) {
      fail('Tick should not be null')
    }
    await ticks.deleteTick(tick._id)

    const newTick = await tickModel.findOne({ _id: tick._id })

    expect(newTick).toBeNull()
  })

  // test importing ticks
  it('should add an array of ticks', async () => {
    const newTicks = await ticks.importTicks(testImport)

    if (newTicks == null) {
      fail(`Should add ${testImport.length} new ticks`)
    }
    expect(newTicks?.length).toEqual(testImport.length)

    const tick1 = await tickModel.findOne({ _id: newTicks[0]._id })
    expect(tick1?._id).toEqual(newTicks[0]._id)

    const tick2 = await tickModel.findOne({ _id: newTicks[1]._id })
    expect(tick2?._id).toEqual(newTicks[1]._id)

    const tick3 = await tickModel.findOne({ _id: newTicks[2]._id })
    expect(tick3?._id).toEqual(newTicks[2]._id)
  })

  it('should grab all ticks by userId', async () => {
    const userProfileInput: UpdateProfileGQLInput = {
      userUuid: userId.toUUID().toString(),
      username: 'cat.dog',
      email: 'cat@example.com'
    }
    await users.createOrUpdateUserProfile(userId, userProfileInput)
    const tick = await ticks.addTick(toTest)

    if (tick == null) {
      fail('Should add a new tick')
    }

    const newTicks = await ticks.ticksByUser({ userId })

    expect(newTicks.length).toEqual(1)
  })

  it('should grab all ticks by userId and climbId', async () => {
    const climbId = toTest.climbId
    const tick = await ticks.addTick(toTest)
    const tick2 = await ticks.addTick(toTest2)

    if (tick == null || tick2 == null) {
      fail('Should add a new tick')
    }
    const userClimbTicks = await ticks.ticksByUserIdAndClimb(climbId, userId.toUUID().toString())
    expect(userClimbTicks.length).toEqual(1)
  })

  it('should delete all ticks with the specified userId', async () => {
    const newTicks = await ticks.importTicks(testImport)

    if (newTicks == null) {
      fail('Should add 3 new ticks')
    }

    await ticks.deleteAllTicks(userId.toUUID().toString())
    const newTick = await tickModel.findOne({ userId })
    expect(newTick).toBeNull()
  })

  it('should only delete MP imports', async () => {
    const MPTick = await ticks.addTick(toTest)
    const OBTick = await ticks.addTick(tickUpdate)
    if (MPTick == null || OBTick == null) {
      fail('Should add two new ticks')
    }

    await ticks.deleteImportedTicks(userId.toUUID().toString())
    const newTick = await tickModel.findOne({ _id: OBTick._id })
    expect(newTick?._id).toEqual(OBTick._id)
    expect(newTick?.notes).toEqual('Not sandbagged')
  })

  it('Should test validation', async () => {
    toTest2.style = 'TR'
    toTest2.attemptType = 'Redpoint'
    await expect(ticks.addTick(toTest2)).rejects.toThrow('Invalid attempt type for a non-lead style')
  })
})
