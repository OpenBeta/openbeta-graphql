import { produce } from 'immer'
import TickDataSource from '../TickDataSource.js'
import { getTickModel, getUserModel } from '../../db/index.js'
import { TickInput } from '../../db/TickTypes.js'
import muuid from 'uuid-mongodb'
import inMemoryDB from '../../utils/inMemoryDB.js'
import { ClimbChangeInputType } from '../../db/ClimbTypes.js'
import MutableClimbDataSource from '../MutableClimbDataSource.js'
import MutableAreaDataSource from '../MutableAreaDataSource.js'

const userId = muuid.v4()
const newClimbsToAdd: ClimbChangeInputType[] = [
  {
    name: 'Sport 1',
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
    name: 'Boulder 1',
    disciplines: {
      bouldering: true
    }
  },
  {
    name: 'Top Rope 1',
    disciplines: {
      tr: true
    }
  },
  {
    name: 'Aid 1',
    disciplines: {
      aid: true
    }
  }
]

const toTestSport: TickInput = {
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

const toTestDWS: TickInput = {
  name: 'Sloppy Peaches',
  notes: 'v sloppy',
  climbId: 'tbd',
  userId: userId.toUUID().toString(),
  attemptType: 'Flash',
  dateClimbed: new Date('2012-10-15'),
  grade: '5.10',
  source: 'MP'
}

const toTestBoulder: TickInput = {
  name: 'Boulder or DWS',
  notes: 'wet!',
  climbId: 'tbd',
  userId: userId.toUUID().toString(),
  style: 'Boulder',
  attemptType: 'Flash',
  dateClimbed: new Date('2012-10-15'),
  grade: 'v4',
  source: 'OB'
}

const toTestTR: TickInput = {
  name: 'Top Rope Climb',
  notes: 'Nice climb',
  climbId: 'tbd',
  userId: userId.toUUID().toString(),
  style: 'TR',
  attemptType: 'Send',
  dateClimbed: new Date('2012-10-15'),
  grade: '5.10',
  source: 'OB'
}

const toTestAid: TickInput = {
  name: 'Aid Climb',
  notes: 'Challenging',
  climbId: 'tbd',
  userId: userId.toUUID().toString(),
  style: 'Aid',
  attemptType: 'Send',
  dateClimbed: new Date('2012-10-15'),
  grade: 'A2',
  source: 'OB'
}

let tickUpdate: TickInput = produce(toTestSport, draft => {
  draft.notes = 'Not sandbagged'
  draft.attemptType = 'Flash'
  draft.source = 'OB'
})

describe('Tick Validation', () => {
  let ticks: TickDataSource
  let climbs: MutableClimbDataSource
  let areas: MutableAreaDataSource
  const tickModel = getTickModel()

  beforeAll(async () => {
    console.log('#BeforeAll Tick Validation')
    await inMemoryDB.connect()

    try {
      await getTickModel().collection.drop()
      await getUserModel().collection.drop()
    } catch (e) {
      console.log('Cleaning db')
    }

    ticks = TickDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
    // Add climbs because add/update tick requires type validation
    await areas.addCountry('usa')
    const newDestination = await areas.addArea(userId, 'California', null, 'usa')
    if (newDestination == null) fail('Expect new area to be created')

    const routesArea = await areas.addArea(userId, 'Sport & Trad', newDestination.metadata.area_id)

    const newIDs = await climbs.addOrUpdateClimbs(userId, routesArea.metadata.area_id, newClimbsToAdd)

    // Update tick inputs with generated climb IDs
    toTestSport.climbId = newIDs[0]
    toTestDWS.climbId = newIDs[1]
    toTestBoulder.climbId = newIDs[2]
    toTestTR.climbId = newIDs[3]
    toTestAid.climbId = newIDs[4]
    tickUpdate = { ...tickUpdate, climbId: newIDs[0] } // Ensure tickUpdate has the correct climbId
  })

  afterAll(async () => {
    await inMemoryDB.close()
  })

  afterEach(async () => {
    await getTickModel().collection.drop()
    await tickModel.ensureIndexes()
  })

  it('should validate tick for sport climb', async () => {
    await expect(ticks.addTick(toTestSport)).resolves.not.toThrow()
  })

  it('should validate tick for deep water solo climb', async () => {
    const dwsTick: TickInput = {
      ...toTestDWS,
      attemptType: 'Send'
    }
    await expect(ticks.addTick(dwsTick)).resolves.not.toThrow()
  })

  it('should throw error for invalid style for deep water solo climb', async () => {
    const invalidDwsTick: TickInput = {
      ...toTestDWS,
      style: 'Lead',
      attemptType: 'Send'
    }
    await expect(ticks.addTick(invalidDwsTick)).rejects.toThrow('Invalid style Lead for climb type')
  })

  it('should validate tick for top rope climb', async () => {
    await expect(ticks.addTick(toTestTR)).resolves.not.toThrow()
  })

  it('should throw error for invalid attempt type for top rope climb', async () => {
    const invalidTrTick: TickInput = {
      ...toTestTR,
      attemptType: 'Pinkpoint'
    }
    await expect(ticks.addTick(invalidTrTick)).rejects.toThrow('Invalid attempt type Pinkpoint for TR/Follow/Aid style')
  })

  it('should validate tick for aid climb', async () => {
    await expect(ticks.addTick(toTestAid)).resolves.not.toThrow()
  })

  it('should throw error for invalid attempt type for aid climb', async () => {
    const invalidAidTick: TickInput = {
      ...toTestAid,
      attemptType: 'Flash'
    }
    await expect(ticks.addTick(invalidAidTick)).rejects.toThrow('Invalid attempt type Flash for TR/Follow/Aid style')
  })

  it('should throw error for invalid style for aid climb', async () => {
    const invalidAidTick: TickInput = {
      ...toTestAid,
      style: 'Lead',
      attemptType: 'Send'
    }
    await expect(ticks.addTick(invalidAidTick)).rejects.toThrow('Invalid style Lead for climb type')
  })

  it('should validate tick with no attempt type', async () => {
    const noAttemptTypeTick: TickInput = {
      ...toTestSport,
      attemptType: undefined
    }
    await expect(ticks.addTick(noAttemptTypeTick)).resolves.not.toThrow()
  })
})
