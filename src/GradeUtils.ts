import { getScale, GradeScales, GradeScalesTypes } from '@openbeta/sandbag'
import isoCountries from 'i18n-iso-countries'
import { DisciplineType, ClimbGradeContextType } from './db/ClimbTypes.js'

/**
 * Grade systems have minor variations between countries. gradeContext is a
 * short abbreviated string that identifies the context in which the grade was assigned
 * and should signify a regional or national variation that may be considered within
 * grade comparisons.
 *
 * Todo:  move this to @openbeta/sandbag library
 */
export enum GradeContexts {
  /** Alaska (United States) */
  ALSK = 'ALSK',
  /** Australia */
  AU = 'AU',
  BRZ = 'BRZ',
  FIN = 'FIN',
  FR = 'FR',
  HK = 'HK',
  NWG = 'NWG',
  POL = 'POL',
  SA = 'SA',
  /** Sweden */
  SWE = 'SWE',
  SX = 'SX',
  /** Central Europe */
  UIAA = 'UIAA',
  /** United Kingdom */
  UK = 'UK',
  /** United States of Ameria */
  US = 'US'
}

/**
 * A conversion from grade context to corresponding grade type / scale
 * Todo: move this to @openbeta/sandbag
 */
export const gradeContextToGradeScales: Partial<Record<GradeContexts, ClimbGradeContextType>> = {
  [GradeContexts.US]: {
    trad: GradeScales.YDS,
    sport: GradeScales.YDS,
    bouldering: GradeScales.VSCALE,
    tr: GradeScales.YDS,
    alpine: GradeScales.YDS,
    mixed: GradeScales.YDS,
    aid: GradeScales.YDS,
    snow: GradeScales.YDS, // is this the same as alpine?
    ice: GradeScales.YDS // is this the same as alpine?
  },
  [GradeContexts.FR]: {
    trad: GradeScales.FRENCH,
    sport: GradeScales.FRENCH,
    bouldering: GradeScales.FONT,
    tr: GradeScales.FRENCH,
    alpine: GradeScales.FRENCH,
    mixed: GradeScales.FRENCH,
    aid: GradeScales.FRENCH,
    snow: GradeScales.FRENCH, // is this the same as alpine?
    ice: GradeScales.FRENCH // is this the same as alpine?
  },
  [GradeContexts.SA]: {
    trad: GradeScales.FRENCH,
    sport: GradeScales.FRENCH,
    bouldering: GradeScales.FONT,
    tr: GradeScales.FRENCH,
    alpine: GradeScales.FRENCH,
    mixed: GradeScales.FRENCH,
    aid: GradeScales.FRENCH,
    snow: GradeScales.FRENCH, // SA does not have a whole lot of snow
    ice: GradeScales.FRENCH // SA does not have a whole lot of ice
  }
}

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

/**
 * A record of all countries with a default grade context that is not US
 */
const COUNTRIES_DEFAULT_NON_US_GRADE_CONTEXT: Record<string, GradeContexts> = {
  AND: GradeContexts.FR,
  ATF: GradeContexts.FR,
  AUS: GradeContexts.AU,
  AUT: GradeContexts.UIAA,
  AZE: GradeContexts.UIAA,
  BEL: GradeContexts.FR,
  BGR: GradeContexts.UIAA,
  BIH: GradeContexts.FR,
  BLR: GradeContexts.UIAA,
  BRA: GradeContexts.BRZ,
  BWA: GradeContexts.SA,
  CHE: GradeContexts.FR,
  CUB: GradeContexts.FR,
  CZE: GradeContexts.UIAA,
  DEU: GradeContexts.UIAA,
  DNK: GradeContexts.UIAA,
  EGY: GradeContexts.FR,
  ESP: GradeContexts.FR,
  EST: GradeContexts.FR,
  FIN: GradeContexts.FIN,
  FRA: GradeContexts.FR,
  GBR: GradeContexts.UK,
  GRC: GradeContexts.FR,
  GUF: GradeContexts.FR,
  HKG: GradeContexts.HK,
  HRV: GradeContexts.FR,
  HUN: GradeContexts.UIAA,
  IOT: GradeContexts.UK,
  IRL: GradeContexts.UK,
  ITA: GradeContexts.FR,
  JEY: GradeContexts.UK,
  JOR: GradeContexts.FR,
  KEN: GradeContexts.UK,
  KGZ: GradeContexts.FR,
  LAO: GradeContexts.FR,
  LIE: GradeContexts.FR,
  LSO: GradeContexts.SA,
  LTU: GradeContexts.FR,
  LUX: GradeContexts.FR,
  LVA: GradeContexts.FR,
  MAR: GradeContexts.FR,
  MCO: GradeContexts.FR,
  MDA: GradeContexts.FR,
  MDG: GradeContexts.FR,
  MKD: GradeContexts.FR,
  MLT: GradeContexts.FR,
  MNE: GradeContexts.UIAA,
  MYS: GradeContexts.FR,
  NAM: GradeContexts.SA,
  NCL: GradeContexts.FR,
  NLD: GradeContexts.FR,
  NOR: GradeContexts.NWG,
  NZL: GradeContexts.AU,
  PER: GradeContexts.FR,
  PNG: GradeContexts.AU,
  POL: GradeContexts.POL,
  PRT: GradeContexts.FR,
  PYF: GradeContexts.FR,
  ROU: GradeContexts.FR,
  RUS: GradeContexts.FR,
  SGP: GradeContexts.FR,
  SRB: GradeContexts.FR,
  SVK: GradeContexts.UIAA,
  SVN: GradeContexts.FR,
  SWE: GradeContexts.SWE,
  THA: GradeContexts.FR,
  TON: GradeContexts.AU,
  TUN: GradeContexts.FR,
  TUR: GradeContexts.FR,
  UGA: GradeContexts.SA,
  UKR: GradeContexts.FR,
  VNM: GradeContexts.FR,
  ZAF: GradeContexts.SA
}

/**
 *
 * @returns all countries with their default grade context
 */
export const getCountriesDefaultGradeContext = (): { [x: string]: GradeContexts } => {
  const countries = { ...COUNTRIES_DEFAULT_NON_US_GRADE_CONTEXT }
  for (const alpha3Code in isoCountries.getAlpha3Codes()) {
    // Any country not found will have a US Grade Context
    if (!(alpha3Code in countries)) {
      countries[alpha3Code] = GradeContexts.US
    }
  }
  return countries
}

export const validDisciplines = ['trad', 'sport', 'bouldering', 'alpine', 'snow', 'ice', 'mixed', 'aid', 'tr']

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
  alpine: false,
  snow: false,
  ice: false,
  mixed: false,
  aid: false,
  tr: false
})
