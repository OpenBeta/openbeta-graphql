import Typesense, { Client } from 'typesense'
import { config } from 'dotenv'

import { areaSchema } from './TypesenseSchemas.js'
import { mongoAreaToTypeSense } from './transformers.js'
import { logger } from '../../../logger.js'
import { AreaType } from '../../AreaTypes.js'
import { DBOperation } from '../../ChangeLogType.js'

config({ path: '.env.local' })
config() // initialize dotenv

/**
 * Return a Typesense client.
 * See https://typesense.org/docs/0.23.1/api/
 * @returns Typesense Client object
 */
export default function typesense (): Client {
  const node = process.env.TYPESENSE_NODE ?? ''
  const apiKey = process.env.TYPESENSE_API_KEY_RW ?? ''

  if (node === '' || apiKey === '') {
    logger.error('Missing env keys')
    process.exit(1)
  }
  const client = new Typesense.Client({
    nodes: [
      {
        host: node,
        port: 443,
        protocol: 'https'
      }
    ],
    apiKey,
    numRetries: 3, // A total of 4 tries (1 original try + 3 retries)
    connectionTimeoutSeconds: 120, // Set a longer timeout for large imports
    logLevel: 'info'
  })
  return client
}

export const addArea = async (area: AreaType, op: DBOperation): Promise<void> => {
  try {
    switch (op) {
      case 'insert':
      case 'update':
        await typesense().collections(areaSchema.name).documents().upsert(mongoAreaToTypeSense(area))
        break
      case 'delete':
        await typesense().collections(areaSchema.name).documents().delete(area.metadata.area_id.toUUID().toString())
        break
    }
  } catch (e) {
    logger.error('Can\'t update Typesense areanindex: ' + area.area_name)
  }
}
