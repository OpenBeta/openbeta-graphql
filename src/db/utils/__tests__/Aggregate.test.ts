import { jest } from '@jest/globals'
import { aggregateCragStats, merge } from '../Aggregate.js'
import { AggregateType } from '../../AreaTypes.js'

describe('Aggregate merge', () => {
  it('should merge 2 objects', () => {
    const lhs = [
      {
        label: '5.6',
        count: 1
      }
    ]

    const rhs = [
      {
        label: '5.6',
        count: 2
      },
      {
        label: '5.7',
        count: 5
      }
    ]

    const actual = merge(lhs, rhs)

    expect(actual).toStrictEqual([
      {
        label: '5.6',
        count: 3
      },
      {
        label: '5.7',
        count: 5
      }
    ])
  })
})

describe('Aggregate Crag Stats', () => {
  it('Provides crag stat aggregates in US grade context', () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const crag = {
      gradeContext: 'US',
      climbs: [
        {
          yds: '5.9',
          grades: {
            yds: '5.9',
            french: '5c'
          },
          type: {
            trad: true,
            tr: true
          }
        },
        {
          yds: '5.12b',
          grades: {
            yds: '5.12b',
            french: '7b'
          },
          type: {
            sport: true,
            tr: true
          }
        },
        {
          yds: '5.8',
          grades: {
            yds: '5.8',
            french: '5b'
          },
          type: {
            trad: true
          }
        },
        {
          yds: '5.9',
          grades: {
            yds: '5.9',
            french: '5c'
          },
          type: {
            trad: true,
            tr: true
          }
        },
        {
          yds: 'V5',
          grades: {
            yds: 'V5',
            font: '6C'
          },
          type: {
            trad: true,
            bouldering: true
          }
        },
        // Mismatch of grade (vscale grade) with grade type (trad : yds scale)
        {
          name: 'mismatched_grade_climb',
          vscale: 'V5',
          grades: {
            vscale: 'V5',
            font: '6C'
          },
          type: {
            trad: true
          }
        }
      ],
      totalClimbs: 6
    }
    const expectedStats: AggregateType = {
      byDiscipline: {
        bouldering: { bands: { advanced: 1, beginner: 0, expert: 0, intermediate: 0, unknown: 0 }, total: 1 },
        sport: { bands: { advanced: 1, beginner: 0, expert: 0, intermediate: 0, unknown: 0 }, total: 1 },
        tr: { bands: { advanced: 1, beginner: 0, expert: 0, intermediate: 2, unknown: 0 }, total: 3 },
        trad: { bands: { advanced: 1, beginner: 1, expert: 0, intermediate: 2, unknown: 1 }, total: 5 }
      },
      byGrade: [
        { count: 2, label: '5.9' },
        { count: 1, label: '5.12b' },
        { count: 1, label: '5.8' },
        { count: 1, label: 'V5' },
        { count: 1, label: 'Unknown' }
      ],
      byGradeBand: { advanced: 2, beginner: 1, expert: 0, intermediate: 2, unknown: 1 }
    }
    // @ts-expect-error
    expect(aggregateCragStats(crag)).toEqual(expectedStats)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Climb: mismatched_grade_climb does not have a corresponding grade with expected grade scale: yds')
    )
  })
  it.todo('Provides crag stat aggregates in FR grade context')
  it('Provides defaults for no climbs in crag', () => {
    const crag = {
      gradeContext: 'US',
      climbs: [],
      totalClimbs: 0
    }
    const expectedStats = {
      byDiscipline: {},
      byGrade: [],
      byGradeBand: { advanced: 0, beginner: 0, expert: 0, intermediate: 0, unknown: 0 }
    }
    // @ts-expect-error
    expect(aggregateCragStats(crag)).toEqual(expectedStats)
  })
})
