import _ from 'underscore'
import { AreaType, CountByGroupType, CountByDisciplineType, AggregateType } from '../AreaTypes.js'

export const mergeAggregates = (lhs: AggregateType, rhs: AggregateType): AggregateType => {
  return {
    byGrade: merge(lhs.byGrade, rhs.byGrade),
    byDiscipline: mergeDisciplines(lhs.byDiscipline, rhs.byDiscipline)
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

export const mergeDisciplines =
  (lhs: CountByDisciplineType, rhs: CountByDisciplineType): CountByDisciplineType => {
    for (const t in rhs) {
      if (typeof lhs[t] === 'undefined') lhs[t] = rhs[t]
      else lhs[t] = (lhs[t] as number) + (rhs[t] as number)
    }
    return lhs
  }

export const aggregateCragStats = (crag: AreaType): AggregateType => {
  const byGrade: Record<string, number> | {} = {}
  const byType: Record<string, number> | {} = {}

  const { climbs } = crag
  climbs.forEach((climb) => {
    const { yds, type } = climb

    // Grade
    const entry: CountByGroupType = byGrade[yds] === undefined ? { label: yds, count: 0 } : byGrade[yds]
    entry.count = entry.count + 1
    byGrade[yds] = entry

    // Disciplines
    for (const t in type) {
      if (type[t] === true) {
        byType[t] = byType[t] === 'undefined' ? 1 : (byType[t] as number) + 1
      }
    }
  })

  return {
    byGrade: Object.values(byGrade) as [CountByGroupType] | [],
    byDiscipline: byType
  }
}
