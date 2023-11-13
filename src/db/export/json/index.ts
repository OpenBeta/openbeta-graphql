import { connectDB, gracefulExit } from '../../index.js'
import { logger } from '../../../logger.js'
import { processMongoCollection, Processor } from '../common/processor.js'
import { getAllAreas } from '../queries/get-all-areas.js'
import { AreaType } from '../../AreaTypes.js'

import { asyncFileProcessor } from './async-file.processor.js'
import { fileURLToPath } from 'url'
import path, { dirname } from 'path'
import fs from 'fs'
import { resolveAreaFileName, resolveAreaSubPath } from './area.resolver.js'

const filename = fileURLToPath(import.meta.url)
const workingDirectory = dirname(filename)

export interface JsonExportOptions {
  /**
   * A function that processes an outputted chunk of data and writes it somewhere.
   * @param data the data emitted from the database
   */
  processor: Processor<Object>
}

async function exportAreaData (options: JsonExportOptions): Promise<void> {
  return await processMongoCollection<AreaType, AreaType>({
    dataGenerator: getAllAreas,
    converter: (climb) => climb,
    processChunk: options.processor
  })
}

async function exportAreasToDisk (output: string): Promise<void> {
  return await exportAreaData({
    processor: asyncFileProcessor({
      basePath: output,
      subPathResolver: resolveAreaSubPath,
      fileNameResolver: resolveAreaFileName
    })
  })
}

async function onDBConnected (): Promise<void> {
  logger.info('Start exporting data as JSON')

  if (
    !process.argv.includes('--output') ||
      process.argv.length < process.argv.indexOf('--output') + 1
  ) {
    logger.error('Missing --output destination...')
    await gracefulExit(1)
  }

  // the path is relative to the current dir inside the build/ directory
  const output = path.resolve(workingDirectory, '../../../../', process.argv[process.argv.indexOf('--output') + 1])
  fs.mkdirSync(output, { recursive: true })

  await exportAreasToDisk(output)

  await gracefulExit()
}

void connectDB(onDBConnected)
