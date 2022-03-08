import _ from 'underscore'
import { AreaType, CountByGroupType, AggregateType } from '../AreaTypes.js'

export const mergeAggregates = (lhs: AggregateType, rhs: AggregateType): AggregateType => {
  return {
    byGrade: merge(lhs.byGrade, rhs.byGrade),
    byType: merge(lhs.byType, rhs.byType)
  }
}

export const merge = (lhs: CountByGroupType[], rhs: CountByGroupType[]): CountByGroupType[] => {
  const lhsDict = _.indexBy(lhs, 'label')
  // for each RHS entry
  rhs.forEach(rhsEntry => {
    // does it exist in LHS?
    if (lhsDict[rhsEntry.label] === undefined) {
      // no - assign to LHS
      lhsDict[rhsEntry.label] = rhsEntry
    } else {
      // yes - add lhs and rhs counts
      lhsDict[rhsEntry.label].count = (lhsDict[rhsEntry.label].count) + rhsEntry.count
    }
  })
  return _.values(lhsDict)
}

export const aggregateCragStats = (crag: AreaType): AggregateType => {
  const byGrade: Record<string, number> | {} = {}
  const byType: Record<string, number> | {} = {}

  crag.climbs.forEach((climb) => {
    const { yds, type } = climb

    // Grade
    const entry: CountByGroupType = byGrade[yds] === undefined ? { label: yds, count: 0 } : byGrade[yds]
    entry.count = entry.count + 1
    byGrade[yds] = entry

    // Disciplines
    for (const t in type) {
      if (type[t] === true) {
        const entry: CountByGroupType = byType[t] !== undefined ? byType[t] : { label: t, count: 0 }
        byType[t] = Object.assign(entry, { count: entry.count + 1 })
      }
    }
  })

  return {
    byGrade: Object.values(byGrade) as [CountByGroupType] | [],
    byType: Object.values(byType) as [CountByGroupType] | []
  }
}
