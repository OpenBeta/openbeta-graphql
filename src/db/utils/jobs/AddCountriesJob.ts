import { connectDB, gracefulExit } from '../../index.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import { logger } from '../../../logger.js'
import countries from 'i18n-iso-countries'

const onConnected = async (): Promise<void> => {
  logger.info('Adding all countries (except USA)')
  logger.info('For USA run: `yarn seed-usa`')
  await insertAllCountries()
  await gracefulExit()
}

const insertAllCountries = async (): Promise<void> => {
  const areaDS = MutableAreaDataSource.getInstance()
  await Promise.all(
    Object.keys(countries).map(async code => {
      if (code === 'US') return null
      return await areaDS.addCountry(code)
    })
  )
}

void connectDB(onConnected)
