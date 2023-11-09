import { getScale, GradeScalesTypes, GradeContexts, gradeContextToGradeScales, getCountriesDefaultGradeContext } from '@openbeta/sandbag'
import { DisciplineType, ClimbGradeContextType } from './db/ClimbTypes.js'

export { GradeContexts, gradeContextToGradeScales, getCountriesDefaultGradeContext }

/**
 * Convert a human-readable grade to the appropriate grade object.
 * @param gradeStr human-readable, eg: '5.9' or '5c'.
 * @param disciplines the climb disciplines
 * @param context grade context
 * @returns grade object
 */
export const createGradeObject = (gradeStr: string, disciplines: DisciplineType | undefined, context: ClimbGradeContextType): Partial<Record<GradeScalesTypes, string>> | undefined => {
  if (disciplines == null) return undefined
  return Object.keys(disciplines).reduce<Partial<Record<GradeScalesTypes, string>> | undefined>((acc, curr) => {
    if (disciplines[curr] === true) {
      const scaleTxt = context[curr]
      const scaleApi = getScale(scaleTxt)
      if (scaleApi != null && !(scaleApi.getScore(gradeStr) < 0)) {
        // only assign valid grade
        if (acc == null) {
          acc = {
            [scaleTxt]: gradeStr
          }
        } else {
          acc[scaleTxt] = gradeStr
        }
      }
    }
    return acc
  }, undefined)
}

export const validDisciplines = ['trad', 'sport', 'bouldering', 'deepwatersolo', 'alpine', 'snow', 'ice', 'mixed', 'aid', 'tr']

/**
 * Perform runtime validation of climb discipline object
 * @param disciplineObj IClimbType
 */
export const sanitizeDisciplines = (disciplineObj: Partial<DisciplineType> | undefined): DisciplineType | undefined => {
  if (disciplineObj == null) return undefined

  const output = validDisciplines.reduce((acc, current) => {
    if (disciplineObj?.[current] != null) {
      acc[current] = disciplineObj[current]
    } else {
      acc[current] = false
    }
    return acc
  }, {})
  // @ts-expect-error
  if (disciplineObj?.boulder != null) {
    // @ts-expect-error
    output.bouldering = disciplineObj.boulder
  }
  return output as DisciplineType
}

export const defaultDisciplines = (): DisciplineType => ({
  trad: false,
  sport: false,
  bouldering: false,
  deepwatersolo: false,
  alpine: false,
  snow: false,
  ice: false,
  mixed: false,
  aid: false,
  tr: false
})
