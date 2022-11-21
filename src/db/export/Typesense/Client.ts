import Typesense, { Client } from 'typesense'

import { areaSchema } from './TypesenseSchemas.js'
import { mongoAreaToTypeSense } from './transformers.js'
import { logger } from '../../../logger.js'
import { AreaType } from '../../AreaTypes.js'
import { DBOperation } from '../../ChangeLogType.js'
import Config from '../../../Config.js'

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
export const updateAreaIndex = async (area: AreaType, op: DBOperation): Promise<void> => {
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
        await typesense()?.collections(areaSchema.name).documents().delete(area.metadata.area_id.toUUID().toString())
        break
    }
  } catch (e) {
    logger.error('Can\'t update Typesense areanindex: ' + area.area_name)
  }
}
