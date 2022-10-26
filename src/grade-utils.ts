import { getScoreForSort, isVScale, GradeScales } from '@openbeta/sandbag'
import { GradeBand } from './db/ClimbTypes.js'

/**
 * Convert grade to band
 * @param grade yds or v scale
 * @param scale GradeScales.VScale | GradeScales.Yds
 * @returns GradeBand
 */
export const getBand = (grade: string): GradeBand => {
  const isV = isVScale(grade)

  if (isV) {
    const score = getScoreForSort(grade, GradeScales.VScale)
    return vScoreToBand(score)
  }
  const score = getScoreForSort(grade, GradeScales.Yds)
  return ysdScoreToBand(score)
}

const ysdScoreToBand = (score: number): GradeBand =>
  score < 54
    ? GradeBand.BEGINNER
    : score < 67.5
      ? GradeBand.INTERMEDIATE
      : score < 82.5
        ? GradeBand.ADVANCED
        : GradeBand.EXPERT

const vScoreToBand = (score: number): GradeBand =>
  score < 50 // v0
    ? GradeBand.BEGINNER
    : score < 60 // v1 - v2
      ? GradeBand.INTERMEDIATE
      : score < 72 // v3 - v6
        ? GradeBand.ADVANCED
        : GradeBand.EXPERT
