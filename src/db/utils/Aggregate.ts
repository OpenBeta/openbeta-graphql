import _ from 'underscore'
import { CountByGroupType, CountByDisciplineType, AggregateType, DisciplineStatsType, CountByGradeBandType, AreaType } from '../AreaTypes'
import { gradeContextToGradeScales } from '../../GradeUtils'
import { ClimbType, ClimbGradeContextType } from '../ClimbTypes'
import { getScale, GradeBands, GradeBandTypes, GradeScalesTypes, isVScale } from '@openbeta/sandbag'
import { logger } from '../../logger'

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
    advanced: _l.advanced + _r.advanced,
    expert: _l.expert + _r.expert
  }
}

const getBand = (discipline: string | undefined, climb: ClimbType, cragGradeScales: ClimbGradeContextType): GradeBandTypes => {
  if (discipline == null) {
    return GradeBands.UNKNOWN
  }
  const gradeScaleValue: GradeScalesTypes = cragGradeScales[discipline]
  let gradeScale = getScale(gradeScaleValue)
  const grade = climb.grades?.[gradeScaleValue]
  if (grade == null) {
    logger.warn(`Climb: ${climb.name} does not have a corresponding grade with expected grade scale: ${gradeScaleValue}`)
    return GradeBands.UNKNOWN
  }
  if (gradeScale == null) {
    return GradeBands.UNKNOWN
  }
  // Changes yds grade scale and type boulder to V grade scale until v grades are split from yds grades
  if ((climb.type.bouldering ?? false) && gradeScale.name === 'yds' && isVScale(grade)) {
    gradeScale = getScale('vscale')
  }
  return gradeScale?.getGradeBand(grade) ?? GradeBands.UNKNOWN
}

export const aggregateCragStats = (crag: AreaType): AggregateType => {
  const byGrade: Record<string, number> | {} = {}
  const disciplines: CountByDisciplineType = {}

  // Assumption: all climbs use the crag's grade context
  const cragGradeScales = gradeContextToGradeScales[crag.gradeContext]
  if (cragGradeScales == null) {
    logger.warn(`Area ${crag.area_name} (${crag.metadata.area_id.toUUID().toString()}) has  invalid grade context: '${crag.gradeContext}'`)
    return {
      byGrade: [],
      byDiscipline: disciplines,
      byGradeBand: {
        ...INIT_GRADEBAND
      }
    }
  }

  const climbs = crag.climbs as ClimbType[]
  climbs.forEach((climb: ClimbType) => {
    const { grades, type = {}, name } = climb
    // Grade
    // Assumption: all types provided from a climb use the same grade scale
    const cragGradeType = Object.keys(type).find(t => Boolean(type[t]) && cragGradeScales[t] !== undefined)
    if (cragGradeType != null) {
      const gradeScaleValue: GradeScalesTypes = cragGradeScales[cragGradeType]
      const grade = grades?.[gradeScaleValue] ?? 'Unknown'
      if (grade === 'Unknown') {
        logger.warn(`Climb: ${name} does not have a corresponding grade with expected grade scale: ${gradeScaleValue}`)
      }
      const entry: CountByGroupType = typeof byGrade[grade] === 'undefined' ? { label: grade, count: 0 } : byGrade[grade]
      entry.count = entry.count + 1
      byGrade[grade] = entry
    }

    // Initialize disciplines object
    for (const t in type) {
      if (type[t] === true) {
        if (disciplines?.[t] == null) {
          disciplines[t] = { ...INIT_DISCIPLINE_STATS }
          disciplines[t].total = 1
        } else {
          disciplines[t].total = (disciplines[t].total as number) + 1
        }
      }
    }
  })

  // Calculate bands for each discipline
  for (const d in disciplines) {
    const climbsByDisciplines = climbs.filter(c => c?.type?.[d] ?? false)
    const _byGradeBand: Record<string, number> = _.countBy(climbsByDisciplines, climb => {
      return getBand(d, climb, cragGradeScales)
    })

    disciplines[d].bands = { ...INIT_GRADEBAND, ..._byGradeBand }
  }

  const _byGradeBand: Record<string, number> = _.countBy(climbs, (climb: ClimbType) => {
    const { type = {} } = climb
    // Assumption: all types provided from a climb use the same grade scale
    const cragGradeType = Object.keys(type).find(t => type[t] === true && cragGradeScales[t] != null)
    return getBand(cragGradeType, climb, cragGradeScales)
  })
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
  advanced: 0,
  expert: 0
}

const INIT_DISCIPLINE_STATS: DisciplineStatsType = {
  total: 0,
  bands: { ...INIT_GRADEBAND }
}
