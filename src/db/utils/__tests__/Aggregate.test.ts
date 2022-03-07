import { merge } from '../Aggregate.js'

describe('Aggregate merge', () => {
  it('should merge 2 objects', () => {
    const lhs = [{
      label: '5.6',
      count: 1
    }]

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
  }
  )
})
