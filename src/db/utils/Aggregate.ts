import _ from 'underscore'
import { CountByGroupType, CountByDisciplineType, AggregateType, DisciplineStatsType, CountByGradeBandType } from '../AreaTypes.js'
import { getBand } from '../../grade-utils.js'
import { ClimbType } from '../ClimbTypes.js'

export const mergeAggregates = (lhs: AggregateType, rhs: AggregateType): AggregateType => {
  return {
    byGrade: merge(lhs.byGrade, rhs.byGrade),
    byDiscipline: mergeDisciplines(lhs.byDiscipline, rhs.byDiscipline),
    byGradeBand: mergeBands(lhs.byGradeBand, rhs.byGradeBand)
  }
}

export const merge = (lhs: CountByGroupType[], rhs: CountByGroupType[]): CountByGroupType[] => {
  const lhsDict = _.indexBy(lhs, 'label')
  // for each RHS entry
  rhs.forEach(rhsEntry => {
    // does it exist in LHS?
    if (typeof lhsDict[rhsEntry.label] === 'undefined') {
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
      else {
        const _l: DisciplineStatsType = lhs[t]
        const _r: DisciplineStatsType = rhs[t]
        _l.total = _l.total + _r.total
        _l.bands = mergeBands(_l.bands, _r.bands)
      }
    }
    return lhs
  }

const mergeBands = (lhs: CountByGradeBandType, rhs: CountByGradeBandType): CountByGradeBandType => {
  const _l = lhs === undefined ? { ...INIT_GRANDEBAND } : lhs
  const _r = rhs === undefined ? { ...INIT_GRANDEBAND } : rhs
  return {
    beginner: _l.beginner + _r.beginner,
    intermediate: _l.intermediate + _r.intermediate,
    advance: _l.advance + _r.advance,
    expert: _l.expert + _r.expert
  }
}

export const aggregateCragStats = (crag: any): AggregateType => {
  const byGrade: Record<string, number> | {} = {}
  const disciplines: CountByDisciplineType = {}

  const climbs = crag.climbs as ClimbType[]
  climbs.forEach((climb: unknown) => {
    const { yds, type } = (climb as ClimbType)

    // Grade
    const entry: CountByGroupType = typeof byGrade[yds] === 'undefined' ? { label: yds, count: 0 } : byGrade[yds]
    entry.count = entry.count + 1
    byGrade[yds] = entry

    // Disciplines
    for (const t in type) {
      if (type[t] === true) {
        if (disciplines?.[t] === undefined) {
          disciplines[t] = { ...INIT_DISCIPLINE_STATS }
          disciplines[t].total = 1
        } else {
          disciplines[t].total = (disciplines[t].total as number) + 1
        }
      }
    }
  })

  for (const d in disciplines) {
    const climbsByDisciplines = climbs.filter(c => c?.type?.[d] ?? false)
    const _byGradeBand: Record<string, number> = _.countBy(climbsByDisciplines, x => getBand(x.yds))

    disciplines[d].bands = { ...INIT_GRANDEBAND, ..._byGradeBand }
  }

  const _byGradBand: Record<string, number> = _.countBy(climbs, (x) => getBand(x.yds))
  const z = { ...INIT_GRANDEBAND, ..._byGradBand }
  return {
    byGrade: Object.values(byGrade) as [CountByGroupType] | [],
    byDiscipline: disciplines,
    byGradeBand: z
  }
}

const INIT_GRANDEBAND: CountByGradeBandType = {
  beginner: 0,
  intermediate: 0,
  advance: 0,
  expert: 0
}

const INIT_DISCIPLINE_STATS: DisciplineStatsType = {
  total: 0,
  bands: { ...INIT_GRANDEBAND }
}
