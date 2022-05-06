import fs from 'node:fs'
import pLimit from 'p-limit'

import { connectDB, gracefulExit, createIndexes } from '../../index.js'
import { createRoot } from './AreaTransformer.js'
import US_STATES from './us-states.js'
import { seedState, dropCollection, JobStats } from './SeedState.js'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

const DEFAULT_CONCURRENT_JOBS = 4
const concurrentJobs: number = process.env.OB_SEED_JOBS !== undefined ? parseInt(process.env.OB_SEED_JOBS) : DEFAULT_CONCURRENT_JOBS

console.log('Data dir', contentDir)
console.log('Max concurrent jobs: ', concurrentJobs)

if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const limiter = pLimit(concurrentJobs > 0 ? concurrentJobs : DEFAULT_CONCURRENT_JOBS)

  // TODO: Allow update.  Right now we drop the entire collection on each run.
  await dropCollection('areas')
  await dropCollection('climbs')

  const rootNode = await createRoot('US')

  const stats: Array<JobStats|any> = await Promise.all<Array<JobStats|any>>(US_STATES.map(async state => {
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

  console.time('Creating indexes')
  await createIndexes()
  console.timeEnd('Creating indexes')

  gracefulExit()
  return await Promise.resolve()
}

const printStats = (stats: Array<JobStats|any>): void => {
  console.log('------------------ Summary -------------------')
  const sums = { states: 0, climbs: 0, areas: 0 }
  for (const entry of stats) {
    if (entry !== undefined) {
      console.log(entry)
      const e = entry as JobStats
      sums.climbs += e.climbCount
      sums.areas += e.climbCount
      sums.states += 1
    }
  }
  console.log('---------------------------------------------')
  console.log('Total: ', sums)
}

connectDB(main)
