import { DisciplineType } from '../db/ClimbTypes.js'
import { sanitizeDisciplines, createGradeObject, gradeContextToGradeScales } from '../GradeUtils.js'

describe('Test grade utilities', () => {
  it('sanitizes bad discipline object', () => {
    const input = {
      trad: true,
      alpine: false,
      pets: ['cat', 'dog']
    }

    const expected: DisciplineType = {
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
    const input: DisciplineType = {
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

    let actual = createGradeObject('5.9', sanitizeDisciplines({ sport: true }), context)
    expect(actual).toEqual({
      yds: '5.9'
    })

    actual = createGradeObject('V4', sanitizeDisciplines({ bouldering: true }), context)
    expect(actual).toEqual({
      vscale: 'V4'
    })

    // mismatch input and discipline
    actual = createGradeObject('V4', sanitizeDisciplines({ trad: true }), context)
    expect(actual).toEqual(null)

    // invalid input
    actual = createGradeObject('6a', sanitizeDisciplines({ trad: true }), context)
    expect(actual).toEqual(null)
  })

  it('creates French grade object correctly', () => {
    const context = gradeContextToGradeScales.FR
    if (context == null) fail('Bad grade context.  Should not happen.')

    let actual = createGradeObject('5a', sanitizeDisciplines({ sport: true }), context)
    expect(actual).toEqual({
      french: '5a'
    })

    actual = createGradeObject('7c', sanitizeDisciplines({ bouldering: true }), context)
    expect(actual).toEqual({
      font: '7c'
    })

    // Invalid input
    actual = createGradeObject('5.9', sanitizeDisciplines({ bouldering: true }), context)
    expect(actual).toEqual(null)
  })
})
