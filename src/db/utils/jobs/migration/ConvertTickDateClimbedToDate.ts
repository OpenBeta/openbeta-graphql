import { connectDB } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { getTickModel } from '../../../TickSchema.js'

/**
 * Converts dateClimbed field on ticks from string to date.
 */
export const onConnected = async (): Promise<void> => {
  logger.info('Migrating ticks...')
  const tickModel = getTickModel()

  await (await tickModel.aggregate([
    {
      $match: { dateClimbed: { $exists: true } }
    },
    {
      $project: {
        dateClimbed: {
          $dateFromString: {
            dateString: '$dateClimbed',
            // We want to ascribe an hour of day to the climb, so it shows
            // up on the correct day when displayed in the user's timezone.
            // Most climbs are in the US, MT time is a good first approximation.
            timezone: 'America/Denver'
          }
        }
      }
    }
  ]))
}

void connectDB(onConnected)
