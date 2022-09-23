import mongoose from 'mongoose'
import muid from 'uuid-mongodb'
import enJson from 'i18n-iso-countries/langs/en.json' assert { type: 'json' }

import { connectDB, gracefulExit } from '../../index.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import { visitAllAreas } from './AreaUpdater.js'
import { visitAllCrags } from './CragUpdater.js'
import { logger } from '../../../logger.js'

const BOT_USER = muid.from('d37b6a9f-2887-4328-87eb-a0c5ca183430')

const onConnected = async (): Promise<void> => {
  logger.info('Initializing database')
  console.time('Update crags')
  await visitAllCrags()
  console.timeEnd('Update crags')
  console.time('Calculating global stats')
  await visitAllAreas()
  console.timeEnd('Calculating global stats')
  await insertAllCountries()
  await gracefulExit()
  return await Promise.resolve()
}

const insertAllCountries = async (): Promise<void> => {
  const areaDS = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
  await Promise.all(
    Object.keys(enJson.countries).map(async code => {
      if (code === 'US') return null
      return await areaDS.addCountry(BOT_USER, code)
    })
  )
}

void connectDB(onConnected)
