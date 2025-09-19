import Typesense, { Client } from 'typesense'

import { areaSchema, climbSchema } from './TypesenseSchemas.js'
import { mongoAreaToTypeSense, mongoClimbToTypeSense } from './transformers.js'
import { logger } from '../../../logger.js'
import { AreaType } from '../../AreaTypes.js'
import { DBOperation } from '../../ChangeLogType.js'
import Config from '../../../Config.js'
import { ClimbExtType, ClimbType } from '../../ClimbTypes.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import { muuidToString } from '../../../utils/helpers.js'

/**
 * Return a Typesense client.
 * See https://typesense.org/docs/0.23.1/api/
 * @returns Typesense Client object
 */
export default function typesense (): Client | undefined {
  const client = new Typesense.Client({
    nodes: [
      {
        host: Config.TYPESENSE_NODE,
        port: 443,
        protocol: 'https'
      }
    ],
    apiKey: Config.TYPESENSE_API_KEY_RW,
    numRetries: 3, // A total of 4 tries (1 original try + 3 retries)
    connectionTimeoutSeconds: 120, // Set a longer timeout for large imports
    logLevel: 'info'
  })
  return client
}

/**
 * Update/remove a record in Area index
 * @param area
 * @param op
 */
export const updateAreaIndex = async (area: AreaType | null, op: DBOperation): Promise<void> => {
  if (area == null) return
  try {
    if (Config.DEPLOYMENT_ENV !== 'production') {
      return
    }
    switch (op) {
      case 'insert':
      case 'update':
        await typesense()?.collections(areaSchema.name).documents().upsert(mongoAreaToTypeSense(area))
        break
      case 'delete':
        await typesense()?.collections(areaSchema.name).documents(area.metadata.area_id.toUUID().toString()).delete()
        break
    }
  } catch (e) {
    logger.error({ exception: e.toString() }, 'Can\'t update Typesense Area index: ' + area.area_name)
  }
}

/**
 * Update/remove a record in Climb index
 * @param area
 * @param op
 */
export const updateClimbIndex = async (climb: ClimbType | null, op: DBOperation): Promise<void> => {
  if (climb == null) return
  try {
    if (Config.DEPLOYMENT_ENV !== 'production') {
      return
    }

    // Look up additional attrs required by Climb index in Typesense.
    const { ancestors } = (await MutableAreaDataSource.getInstance().findOneAreaByUUID(climb.metadata.areaRef)).embeddedRelations

    const climbExt: ClimbExtType = {
      ...climb,
      pathTokens: ancestors.map(i => i.name),
      ancestors: ancestors.map(i => muuidToString(i.uuid)).join(',')
    }

    switch (op) {
      case 'insert':
      case 'update':
        await typesense()?.collections(climbSchema.name).documents().upsert(mongoClimbToTypeSense(climbExt))
        break
      case 'delete':
        await typesense()?.collections(climbSchema.name).documents(climb._id.toUUID().toString()).delete()
        break
    }
  } catch (e) {
    logger.error({ exception: e.toString() }, 'Can\'t update Typesense Climb index: ' + climb.name)
  }
}
