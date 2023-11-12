import fs from 'node:fs'
import pLimit from 'p-limit'

import { connectDB, gracefulExit, createIndexes } from '../../index'
import { createRoot } from './AreaTransformer'
import US_STATES from './us-states.js'
import { seedState, dropCollection, JobStats } from './SeedState'
import { logger } from '../../../logger'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

const DEFAULT_CONCURRENT_JOBS = 4
const concurrentJobs: number = process.env.OB_SEED_JOBS !== undefined ? parseInt(process.env.OB_SEED_JOBS) : DEFAULT_CONCURRENT_JOBS

logger.info('Data dir', contentDir)
logger.info('Max concurrent jobs: ', concurrentJobs)

if (contentDir === '') {
  logger.error('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const limiter = pLimit(concurrentJobs > 0 ? concurrentJobs : DEFAULT_CONCURRENT_JOBS)

  // TODO: Allow update.  Right now we drop the entire collection on each run.
  await dropCollection('areas')
  await dropCollection('climbs')

  console.time('Creating indexes')
  await createIndexes()
  console.timeEnd('Creating indexes')

  const rootNode = await createRoot('US', 'USA')

  const stats: Array<JobStats | any> = await Promise.all<Array<JobStats | any>>(US_STATES.map(async state => {
    const code = state.code.toLowerCase()
    const fRoutes = `${contentDir}/${code}-routes.jsonlines`
    const fAreas = `${contentDir}/${code}-areas.jsonlines`

    if (fs.existsSync(fRoutes) && fs.existsSync(fAreas)) {
      /* eslint-disable-next-line */
      return limiter(seedState, rootNode, code, fRoutes, fAreas)
    }
    return await Promise.resolve()
  }))

  printStats(stats)

  await gracefulExit()
  return await Promise.resolve()
}

const printStats = (stats: Array<JobStats | any>): void => {
  logger.info('------------------ Summary -------------------')
  const sums = { states: 0, climbs: 0, areas: 0 }
  for (const entry of stats) {
    if (entry !== undefined) {
      logger.info(entry)
      const e = entry as JobStats
      sums.climbs += e.climbCount
      sums.areas += e.climbCount
      sums.states += 1
    }
  }
  logger.info('---------------------------------------------')
  logger.info('Total: ', sums)
}

void connectDB(main)
