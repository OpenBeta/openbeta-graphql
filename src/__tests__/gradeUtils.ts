import { IClimbType } from '../db/ClimbTypes.js'
import { sanitizeDisciplines, createGradeObject, gradeContextToGradeScales } from '../GradeUtils.js'

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

  it('creates USA grade object correctly', () => {
    const context = gradeContextToGradeScales.US
    if (context == null) fail('Bad grade context.  Should not happen.')
    let actual = createGradeObject('5.9', { sport: true }, context)
    expect(actual).toEqual({
      yds: '5.9'
    })

    actual = createGradeObject('V4', { bouldering: true }, context)
    expect(actual).toEqual({
      vscale: 'V4'
    })

    // mismatch input and discipline
    actual = createGradeObject('V4', { trad: true }, context)
    expect(actual).toEqual({})

    // invalid input
    actual = createGradeObject('6a', { trad: true }, context)
    expect(actual).toEqual({})
  })

  it('creates French grade object correctly', () => {
    const context = gradeContextToGradeScales.FR
    if (context == null) fail('Bad grade context.  Should not happen.')

    let actual = createGradeObject('5a', { sport: true }, context)
    expect(actual).toEqual({
      french: '5a'
    })

    actual = createGradeObject('7c', { bouldering: true }, context)
    expect(actual).toEqual({
      font: '7c'
    })

    // Invalid input
    actual = createGradeObject('5.9', { bouldering: true }, context)
    expect(actual).toEqual({})
  })
})
