import { produce } from 'immer'
import { TickInput, TickType } from '../../db/TickTypes.js'
import { allowableStyleMap, dataFixtures } from '../../__tests__/fixtures/data.fixtures.js'
import { muuidToString } from '../../utils/helpers.js'
import muuid from 'uuid-mongodb'

interface LocalContext {
  tickImportData: TickInput[]
  tickData: TickInput
  tickUpdateData: TickInput
  tick: TickType
}

function choose<T> (arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const it = dataFixtures.extend<LocalContext>({
  tickImportData: async ({ task, userUuid, climb }, use) => await use(
    Array.from({ length: 20 }).map((_, idx) => (
      {
        name: `${task.id}-${idx}`,
        notes: 'Sandbagged',
        climbId: muuidToString(climb._id),
        userId: userUuid,
        style: 'Lead',
        attemptType: choose(allowableStyleMap.Lead),
        dateClimbed: new Date(),
        grade: '5.7',
        source: 'MP'
      }
    ))),
  tickData: async ({ userUuid, climb }, use) => await use({
    name: 'Small Dog',
    notes: 'Sandbagged',
    climbId: muuidToString(climb._id),
    userId: userUuid,
    style: 'Lead',
    attemptType: choose(allowableStyleMap.Lead),
    dateClimbed: new Date('2012-12-12'),
    grade: '5.7',
    source: 'MP'
  }),

  tickUpdateData: async ({ tickData }, use) => await use(produce(tickData, draft => {
    draft.notes = 'Not sandbagged'
    draft.attemptType = choose(allowableStyleMap[tickData.style ?? 'Lead'])
    draft.source = 'OB'
  })),
  tick: async ({ ticks, tickData }, use) => await use(await ticks.addTick(tickData))
})

describe('Ticks', () => {
  // test adding tick
  it('should create a new tick for the associated climb', async ({ ticks, tickData }) => {
    const tick = await ticks.addTick(tickData)
    const newTick = await ticks.tickModel.findOne({ userId: tickData.userId })
    expect(newTick?._id).toEqual(tick._id)
  })

  // test updating tick
  it('should update a tick and return the proper information', async ({ ticks, tick, tickUpdateData }) => {
    const newTick = await ticks.editTick({ _id: tick._id }, tickUpdateData)

    expect(newTick).not.toBeNull()

    expect(newTick?._id).toEqual(tick._id)
    expect(newTick?.notes).toEqual(tickUpdateData.notes)
    expect(newTick?.attemptType).toEqual(tickUpdateData.attemptType)
  })

  // test removing tick
  it('should remove a tick', async ({ ticks, tick }) => {
    await ticks.deleteTick(tick._id)
    const newTick = await ticks.tickModel.findOne({ _id: tick._id })
    expect(newTick).toBeNull()
  })

  // test importing ticks
  it('should add an array of ticks', async ({ ticks, tickImportData }) => {
    const newTicks = await ticks.importTicks(tickImportData)

    expect(newTicks).not.toBeNull()
    expect(newTicks).toHaveLength(tickImportData.length)

    const tick1 = await ticks.tickModel.findOne({ _id: newTicks[0]._id })
    expect(tick1?._id).toEqual(newTicks[0]._id)

    const tick2 = await ticks.tickModel.findOne({ _id: newTicks[1]._id })
    expect(tick2?._id).toEqual(newTicks[1]._id)

    const tick3 = await ticks.tickModel.findOne({ _id: newTicks[2]._id })
    expect(tick3?._id).toEqual(newTicks[2]._id)
  })

  it('should grab all ticks by userId', async ({ ticks, tick, userUuid, profile }) => {
    const newTicks = await ticks.ticksByUser({ userId: profile._id })
    newTicks.forEach(tick => expect(tick.userId).toEqual(userUuid))
    expect(newTicks[0]._id.equals(tick._id))
  })

  it('should grab all ticks by userId and climbId', async ({ ticks, tickImportData, climb, userUuid }) => {
    await Promise.all([
      ticks.addTick(tickImportData[0]),
      ticks.addTick(tickImportData[1]),
      ticks.addTick({ ...tickImportData[1], userId: muuidToString(muuid.v4()) })
    ])

    const userClimbTicks = await ticks.ticksByUserIdAndClimb(muuidToString(climb._id), userUuid)
    expect(userClimbTicks).toHaveLength(2)
  })

  it('should delete all ticks with the specified userId', async ({ ticks, tickImportData, userUuid }) => {
    const newTicks = await ticks.importTicks(tickImportData)

    expect(newTicks).not.toBeNull()
    expect(newTicks).toHaveLength(tickImportData.length)

    await ticks.deleteAllTicks(userUuid)
    const newTick = await ticks.tickModel.findOne({ userId: userUuid })
    expect(newTick).toBeNull()
  })

  it('should only delete MP imports', async ({ ticks, tickData, tickUpdateData, userUuid }) => {
    const MPTick = await ticks.addTick(tickData)
    const OBTick = await ticks.addTick(tickUpdateData)

    expect(MPTick).not.toBeNull()
    expect(OBTick).not.toBeNull()

    await ticks.deleteImportedTicks(userUuid)
    const newTick = await ticks.tickModel.findOne({ _id: OBTick._id })
    expect(newTick?._id).toEqual(OBTick._id)
    expect(newTick?.notes).toEqual('Not sandbagged')
  })
})
