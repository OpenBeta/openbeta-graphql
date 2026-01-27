import { connectDB, gracefulExit } from '../../index.js'
import { updateAllAreas } from './TreeUpdaters/updateAllAreas.js'
import { visitAllCrags } from './CragUpdater.js'
import { logger } from '../../../logger.js'

const onConnected = async (): Promise<void> => {
  logger.info('Initializing database')
  console.time('Calculating global stats')
  await visitAllCrags()
  await updateAllAreas()
  console.timeEnd('Calculating global stats')
  await gracefulExit()
  return await Promise.resolve()
}

void connectDB(onConnected)
