import { IClimbType } from '../db/ClimbTypes.js'
import { sanitizeDisciplines } from '../GradeUtils.js'

describe('Test grade utilities', () => {
  it('sanitizes bad discipline object', () => {
    const input = {
      trad: true,
      alpine: false,
      pets: ['cat', 'dog']
    }

    const expected: IClimbType = {
      trad: true,
      sport: false,
      bouldering: false,
      alpine: false,
      snow: false,
      ice: false,
      mixed: false,
      aid: false,
      tr: false
    }
    expect(sanitizeDisciplines(input)).toEqual(expected)
  })

  it('preserves all disciplines', () => {
    const input: IClimbType = {
      trad: false,
      sport: false,
      bouldering: true,
      alpine: false,
      snow: false,
      ice: false,
      mixed: false,
      aid: false,
      tr: false
    }
    expect(sanitizeDisciplines(input)).toEqual(input)
  })
})
