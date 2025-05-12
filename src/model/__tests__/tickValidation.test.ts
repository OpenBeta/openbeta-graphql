import { allowableStyleMap, choose, dataFixtures } from '../../__tests__/fixtures/data.fixtures.js'
import { muuidToString } from '../../utils/helpers.js'
import { ClimbChangeInputType } from '../../db/ClimbTypes.js'
import {
  TickInput,
  TickStyleValues
} from '../../db/TickTypes.js'

interface LocalContext {
  tick: (
    props?: Partial<TickInput> & {
      climb?: Partial<ClimbChangeInputType>
    },
  ) => Promise<TickInput>
}

const it = dataFixtures.extend<LocalContext>({
  tick: async ({ userUuid, addClimb }, use) =>
    await use(async (props) => {
      const { climb, ...tick } = props ?? {}

      const reifiedClimb = await addClimb(climb)
      const style = tick.style ?? choose(TickStyleValues)
      const attemptType = tick.attemptType ?? choose(allowableStyleMap[style])
      return {
        name: reifiedClimb.name,
        notes: 'Sandbagged',
        climbId: muuidToString(reifiedClimb._id),
        userId: userUuid,
        style,
        attemptType,
        dateClimbed: new Date('2012-12-12'),
        grade: '5.7',
        source: 'MP',
        ...tick
      }
    })
})

describe('Tick Validation', () => {
  it('should validate tick for sport climb', async ({ ticks, tick }) => {
    const tickData = await tick({ style: 'Lead' })
    await expect(ticks.addTick(tickData)).resolves.not.toThrow()
  })

  it('should validate tick for deep water solo climb', async ({
    ticks,
    tick
  }) => {
    const tickData = await tick({
      climb: { disciplines: { deepwatersolo: true } },
      attemptType: 'Send',
      style: undefined
    })

    await expect(ticks.addTick(tickData)).resolves.not.toThrow()
  })

  it('should throw error for invalid style for deep water solo climb', async ({
    ticks,
    tick
  }) => {
    const invalidDwsTick: TickInput = await tick({
      style: 'Lead',
      attemptType: 'Send',
      climb: { disciplines: { deepwatersolo: true } }
    })

    await expect(ticks.addTick(invalidDwsTick)).rejects.toThrow(
      'Invalid style Lead for climb type'
    )
  })

  it('should validate tick for top rope climb', async ({ ticks, tick }) => {
    const tickData = await tick({
      style: 'TR',
      climb: { disciplines: { tr: true } }
    })
    await expect(ticks.addTick(tickData)).resolves.not.toThrow()
  })

  it('should throw error for invalid attempt type for top rope climb', async ({
    ticks,
    tick
  }) => {
    const invalidTrTick = await tick({
      attemptType: 'Pinkpoint',
      style: 'TR',
      climb: {
        disciplines: { tr: true }
      }
    })

    await expect(ticks.addTick(invalidTrTick)).rejects.toThrow(
      'Invalid attempt type Pinkpoint for TR/Follow/Aid style'
    )
  })

  it('should validate tick for aid climb', async ({ ticks, tick }) => {
    const tickData = await tick({
      style: 'Aid',
      climb: { disciplines: { aid: true } }
    })
    await expect(ticks.addTick(tickData)).resolves.not.toThrow()
  })

  it('should throw error for invalid attempt type for aid climb', async ({
    ticks,
    tick
  }) => {
    const invalidAidTick = await tick({
      style: 'Aid',
      attemptType: 'Flash',
      climb: { disciplines: { aid: true } }
    })

    await expect(ticks.addTick(invalidAidTick)).rejects.toThrow(
      'Invalid attempt type Flash for TR/Follow/Aid style'
    )
  })

  it('should throw error for invalid style for aid climb', async ({
    ticks,
    tick
  }) => {
    const invalidAidTick: TickInput = await tick({
      style: 'Lead',
      attemptType: 'Send',
      grade: 'A2',
      climb: { disciplines: { aid: true } }
    })

    await expect(ticks.addTick(invalidAidTick)).rejects.toThrow(
      'Invalid style Lead for climb type'
    )
  })

  it('should validate tick with no attempt type', async ({ ticks, tick }) => {
    const noAttemptTypeTick: TickInput = {
      ...(await tick({
        style: 'Lead',
        climb: { disciplines: { sport: true } }
      })),
      attemptType: undefined
    }
    await expect(ticks.addTick(noAttemptTypeTick)).resolves.not.toThrow()
  })
})
