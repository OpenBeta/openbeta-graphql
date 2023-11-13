import { connectDB, gracefulExit } from '../../index'
import { visitAllAreas } from './TreeUpdater'
import { visitAllCrags } from './CragUpdater'
import { logger } from '../../../logger'

const onConnected = async (): Promise<void> => {
  logger.info('Initializing database')
  console.time('Calculating global stats')
  await visitAllCrags()
  await visitAllAreas()
  console.timeEnd('Calculating global stats')
  await gracefulExit()
  return await Promise.resolve()
}

void connectDB(onConnected)
