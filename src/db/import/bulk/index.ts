import fs from 'node:fs'
import { logger } from '../../../logger.js'
import { connectDB, gracefulExit } from '../../index.js'
import { bulkImportJson } from './import-json.js'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

if (contentDir === '') {
  logger.error('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const dataFile = `${contentDir}/import.json`
  if (!fs.existsSync(dataFile)) {
    logger.error(`Missing ${dataFile}`)
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'))
  await bulkImportJson(data)

  await gracefulExit()
}

void connectDB(main)
