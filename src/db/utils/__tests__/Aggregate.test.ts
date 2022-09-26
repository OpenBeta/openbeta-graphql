import { aggregateCragStats, merge } from '../Aggregate.js'

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
        }
      ],
      totalClimbs: 4
    }
    const expectedStats = {
      byDiscipline: {
        sport: { bands: { advance: 1, beginner: 0, expert: 0, intermediate: 0, unknown: 0 }, total: 1 },
        tr: { bands: { advance: 1, beginner: 0, expert: 0, intermediate: 2, unknown: 0 }, total: 3 },
        trad: { bands: { advance: 0, beginner: 1, expert: 0, intermediate: 2, unknown: 0 }, total: 3 }
      },
      byGrade: [
        { count: 2, label: '5.9' },
        { count: 1, label: '5.12b' },
        { count: 1, label: '5.8' }
      ],
      byGradeBand: { advance: 1, beginner: 1, expert: 0, intermediate: 2, unknown: 0 }
    }
    expect(aggregateCragStats(crag)).toEqual(expectedStats)
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
      byGradeBand: { advance: 0, beginner: 0, expert: 0, intermediate: 0, unknown: 0 }
    }
    expect(aggregateCragStats(crag)).toEqual(expectedStats)
  })
})
