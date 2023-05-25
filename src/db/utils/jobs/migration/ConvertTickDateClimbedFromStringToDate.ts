import { connectDB, } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { getTickModel } from '../../../TickSchema.js'

/**
 * Converts dateClimbed field on ticks from string to date.
 */
const onConnected = async (): Promise<void> => {
  logger.info('Migrating ticks...')
  const tickModel = getTickModel()

  await (await tickModel.updateMany(
    { dateClimbed: { $exists: true } },
    { $set: { dateClimbed: { $toDate: '$dateClimbed' } } }
  ))
}

void connectDB(onConnected)
