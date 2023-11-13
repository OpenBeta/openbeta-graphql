import { Client } from 'typesense'

import typesenseClient from './Client'
import { connectDB, gracefulExit } from '../../index'
import { ClimbExtType } from '../../ClimbTypes'
import { logger } from '../../../logger'
import { areaSchema, AreaTypeSenseItem, climbSchema, ClimbTypeSenseItem } from './TypesenseSchemas'
import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections.js'
import { AreaType } from '../../AreaTypes'
import { mongoAreaToTypeSense, mongoClimbToTypeSense } from './transformers'
import { processMongoCollection } from '../common/index'
import { getAllAreas, getAllClimbs } from '../queries/index'

/**
 * For a given collection that might exist in typesense, drop it (if it exists)
 * and then create it again with the set schema.
 * This keeps schema up to date, and pre-empts duplicates.
 */
async function checkCollection (
  client: Client,
  schema: CollectionCreateSchema
): Promise<void> {
  try {
    // Delete if the collection already exists from a previous run
    await client.collections(schema.name).delete()
    logger.info(`dropped ${schema.name} collection from typesense`)
  } catch (error) {
    logger.error(error)
  }

  // Create a collection matching the specified schema
  try {
    await client.collections().create(schema)
    logger.info(`created ${schema.name} typesense collection`)
  } catch (error) {
    logger.error(error)
    await gracefulExit()
  }
}

async function uploadChunk (client: Client, schema: CollectionCreateSchema, chunk: Object[]): Promise<void> {
  // Chunk entries may not exceed chunkSize
  if (chunk.length === 0) return

  try {
    logger.info(`pushing ${chunk.length} documents to typesense`)
    // This is safe enough. If anyone's gonna pass a non-object type then
    // they haven't been paying attention
    await client.collections(schema.name).documents().import(chunk, { action: 'upsert' })
  } catch (e) {
    logger.error(e)
  }
}

async function updateClimbTypesense (client: Client): Promise<void> {
  await processMongoCollection<ClimbTypeSenseItem, ClimbExtType>({
    preProcess: async () => await checkCollection(client, climbSchema),
    converter: mongoClimbToTypeSense,
    dataGenerator: getAllClimbs,
    processChunk: async (chunk) => await uploadChunk(client, climbSchema, chunk)
  })
}

async function updateAreaTypesense (client: Client): Promise<void> {
  await processMongoCollection<AreaTypeSenseItem, AreaType>({
    preProcess: async () => await checkCollection(client, areaSchema),
    converter: mongoAreaToTypeSense,
    dataGenerator: getAllAreas,
    processChunk: async (chunk) => await uploadChunk(client, areaSchema, chunk)
  })
}

async function onDBConnected (): Promise<void> {
  const node = process.env.TYPESENSE_NODE ?? ''
  const apiKey = process.env.TYPESENSE_API_KEY_RW ?? ''

  if (node === '' || apiKey === '') {
    logger.error('Missing env keys')
    await gracefulExit(1)
  }

  const typesense = typesenseClient()
  if (typesense == null) {
    process.exit(1)
  }

  logger.info('Start pushing data to TypeSense')

  if (process.argv.includes('--climbs')) {
    // Update climb data in typesense
    await updateClimbTypesense(typesense)
    logger.info('Climbs pushed to typesense')
  }

  if (process.argv.includes('--areas')) {
  // Update area data in typesense
    await updateAreaTypesense(typesense)
    logger.info('areas pushed to typesense')
  }

  await gracefulExit()
}

void connectDB(onDBConnected)
