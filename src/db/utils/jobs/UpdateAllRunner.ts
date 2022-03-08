import { connectDB, gracefulExit } from '../../index.js'
import { visitAllAreas } from './AreaUpdater.js'
import { visitAllCrags } from './CragUpdater.js'

const onConnected = async (): Promise<void> => {
  console.log('Initializing database')
  console.time('Update crags')
  await visitAllCrags()
  console.timeEnd('Update crags')

  console.time('Calculating global stats')
  await visitAllAreas()
  console.timeEnd('Calculating global stats')
  gracefulExit()
  return await Promise.resolve()
}

connectDB(onConnected)
