import mongoose from 'mongoose'
import { produce } from 'immer'
import TickDataSource from '../TickDataSource.js'
import { connectDB, getTickModel } from '../../db/index.js'
import { TickType } from '../../db/TickTypes.js'

const toTest: TickType = {
  name: 'Small Dog',
  notes: 'Sandbagged',
  climbId: 'c76d2083-6b8f-524a-8fb8-76e1dc79833f',
  userId: 'abc123',
  style: 'Lead',
  attemptType: 'Onsight',
  dateClimbed: '12/12/12',
  grade: '5.7',
  source: 'MP'
}

const toTest2: TickType = {
  name: 'Sloppy Peaches',
  notes: 'v sloppy',
  climbId: 'b767d949-0daf-5af3-b1f1-626de8c84b2a',
  userId: 'abc123',
  style: 'Lead',
  attemptType: 'Flash',
  dateClimbed: '12/10/15',
  grade: '5.10',
  source: 'MP'
}

const tickUpdate: TickType = produce(toTest, draft => {
  draft.notes = 'Not sandbagged'
  draft.attemptType = 'Fell/Hung'
  draft.source = 'OB'
})

const testImport: TickType[] = [
  toTest, toTest2, tickUpdate
]

describe('Ticks', () => {
  let ticks: TickDataSource
  const tickModel = getTickModel()

  beforeAll(async () => {
    console.log('#BeforeAll Ticks')
    await connectDB()
    try {
      await getTickModel().collection.drop()
    } catch (e) {
      console.log('Cleaning db')
    }

    ticks = new TickDataSource(mongoose.connection.db.collection('ticks'))
  })

  afterAll(async () => {
    await mongoose.connection.close()
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
    const tick = await ticks.addTick(toTest)

    if (tick == null) {
      fail('Should add a new tick')
    }

    const newTicks = await ticks.ticksByUser('abc123')

    expect(newTicks.length).toEqual(1)
  })

  it('should grab all ticks by userId and climbId', async () => {
    const climbId = 'c76d2083-6b8f-524a-8fb8-76e1dc79833f'
    const tick = await ticks.addTick(toTest)
    const tick2 = await ticks.addTick(toTest2)

    if (tick == null || tick2 == null) {
      fail('Should add a new tick')
    }
    const userClimbTicks = await ticks.ticksByUserAndClimb('abc123', climbId)
    expect(userClimbTicks.length).toEqual(1)
  })

  it('should delete all ticks with the specified userId', async () => {
    const userId = 'abc123'
    const newTicks = await ticks.importTicks(testImport)

    if (newTicks == null) {
      fail('Should add 3 new ticks')
    }

    await ticks.deleteAllTicks(userId)
    const newTick = await tickModel.findOne({ userId: userId })
    expect(newTick).toBeNull()
  })

  it('should only delete MP imports', async () => {
    const userId = 'abc123'
    const MPTick = await ticks.addTick(toTest)
    const OBTick = await ticks.addTick(tickUpdate)

    if (MPTick == null || OBTick == null) {
      fail('Should add two new ticks')
    }

    await ticks.deleteImportedTicks(userId)
    const newTick = await tickModel.findOne({ _id: OBTick._id })
    expect(newTick?._id).toEqual(OBTick._id)
    expect(newTick?.notes).toEqual('Not sandbagged')
  })

  it('should reject duplicate ticks', async () => {
    const tick1: TickType = {
      name: 'Small Dog',
      notes: 'Not sandbagged',
      climbId: 'c76d2083-6b8f-524a-8fb8-76e1dc79833f',
      userId: 'user123',
      style: 'Lead',
      attemptType: 'Fell/Hung',
      dateClimbed: '12/12/12',
      grade: '5.7',
      source: 'OB'
    }

    await ticks.addTick(tick1)

    await expect(
      ticks.addTick(tick1)
    ).rejects.toThrow()
  })
})
