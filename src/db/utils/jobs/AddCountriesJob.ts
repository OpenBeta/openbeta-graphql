import mongoose from 'mongoose'
import enJson from 'i18n-iso-countries/langs/en.json' assert { type: 'json' }

import { connectDB, gracefulExit } from '../../index.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import { logger } from '../../../logger.js'

const onConnected = async (): Promise<void> => {
  logger.info('Adding all countries (except USA)')
  logger.info('For USA run: `yarn seed-usa`')
  await insertAllCountries()
  await gracefulExit()
}

const insertAllCountries = async (): Promise<void> => {
  const areaDS = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
  await Promise.all(
    Object.keys(enJson.countries).map(async code => {
      if (code === 'US') return null
      return await areaDS.addCountry(code)
    })
  )
}

void connectDB(onConnected)
