import _ from 'underscore'
import { CountByGroupType, CountByDisciplineType, AggregateType, DisciplineStatsType, CountByGradeBandType } from '../AreaTypes.js'
import { getBand, gradeContextToGradeScales, GradeScales } from '../../grade-utils.js'
import { ClimbType, GradeBand } from '../ClimbTypes.js'

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
  const _l = lhs === undefined ? { ...INIT_GRADEBAND } : lhs
  const _r = rhs === undefined ? { ...INIT_GRADEBAND } : rhs
  return {
    unknown: _l.unknown + _r.unknown,
    beginner: _l.beginner + _r.beginner,
    intermediate: _l.intermediate + _r.intermediate,
    advance: _l.advance + _r.advance,
    expert: _l.expert + _r.expert
  }
}

export const aggregateCragStats = (crag: any): AggregateType => {
  const byGrade: Record<string, number> | {} = {}
  const disciplines: CountByDisciplineType = {}

  // Assumption: all climbs use the crag's grade context
  const cragGradeScales = gradeContextToGradeScales[crag.gradeContext]
  const climbs = crag.climbs as ClimbType[]
  climbs.forEach((climb: unknown) => {
    const { grades, type = {}, name } = (climb as ClimbType)
    // Grade
    // Assumption: all types provided from a climb use the same grade scale
    const cragGradeType = Object.keys(type).find(t => type[t] === true && cragGradeScales[t] !== undefined)
    if (cragGradeType !== undefined) {
        const gradeScale: GradeScales = cragGradeScales[cragGradeType]
        // Assumption: the climb has the specified grade scale in data.
        const grade = grades[gradeScale]
        if (grade === undefined) {
          console.warn(`Climb: ${name} does not have a corresponding grade with expected grade scale: ${gradeScale}`)
        }
        const entry: CountByGroupType = typeof byGrade[grade as string] === 'undefined' ? { label: grade, count: 0 } : byGrade[grade as string]
        entry.count = entry.count + 1
        byGrade[grade as string] = entry
    }

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
    // discipline is grade type
    const climbsByDisciplines = climbs.filter(c => c?.type?.[d] ?? false)
    // TODO: Update to use grade scale per type
    const gradeScale: GradeScales = cragGradeScales[d]
    const _byGradeBand: Record<string, number> = _.countBy(climbsByDisciplines, climb => {
      const grade = climb.grades[gradeScale]
      if (grade === 'undefined') {
        console.warn(`Climb: ${climb.name} does not have a corresponding grade with expected grade scale: ${gradeScale}`)
      }
      return getBand(grade as string, d, crag.gradeContext)
    })

    disciplines[d].bands = { ...INIT_GRADEBAND, ..._byGradeBand }
  }

  const _byGradeBand: Record<string, number> = _.countBy(climbs, (climb: ClimbType) => {
    const { grades, type = {}, name } = (climb as ClimbType)
    // Assumption: all types provided from a climb use the same grade scale
    const cragGradeType = Object.keys(type).find(t => type[t] === true && cragGradeScales[t] !== undefined)
    const gradeScale: GradeScales = cragGradeScales[cragGradeType]
    const grade = grades[gradeScale]
    if (grade === undefined || cragGradeType === undefined) {
      console.warn(`Climb: ${name} does not have a corresponding grade or type with expected grade scale: ${gradeScale}`)
      return GradeBand.UNKNOWN
    }
    return getBand(grade as string, cragGradeType, crag.gradeContext)})
  const z = { ...INIT_GRADEBAND, ..._byGradeBand }
  return {
    byGrade: Object.values(byGrade) as [CountByGroupType] | [],
    byDiscipline: disciplines,
    byGradeBand: z
  }
}

const INIT_GRADEBAND: CountByGradeBandType = {
  unknown: 0,
  beginner: 0,
  intermediate: 0,
  advance: 0,
  expert: 0
}

const INIT_DISCIPLINE_STATS: DisciplineStatsType = {
  total: 0,
  bands: { ...INIT_GRADEBAND }
}
