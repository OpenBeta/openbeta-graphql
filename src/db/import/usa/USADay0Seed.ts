import mongoose from 'mongoose'
import fs from 'node:fs'
import readline from 'node:readline'

import { connectDB, gracefulExit, createAreaModel } from '../../index.js'
import { AreaType } from '../../AreaTypes.js'
import { addClimbsToAreas } from './AddClimbsToCrags.js'
import { createClimbModel } from '../../ClimbSchema.js'
import { ClimbType } from '../../ClimbTypes.js'
import transformClimbRecord from '../ClimbTransformer.js'
import { createAreas, createRoot } from './AreaTransformer.js'
import US_STATES from './us-states.js'
import { AreaNode } from './AreaTree.js'
import { visitAll } from '../../utils/AreaUpdates.js'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''
console.log('Data dir', contentDir)
if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  await _dropCollection('areas')
  const rootNode = await createRoot('US')
  await Promise.all(US_STATES.map(async state => {
    const code = state.code.toLowerCase()
    const fRoutes = `${contentDir}/${code}-routes.jsonlines`
    const fAreas = `${contentDir}/${code}-areas.jsonlines`
    if (fs.existsSync(fRoutes) && fs.existsSync(fAreas)) {
      console.log('Loading beginning: ', code)
      return await seedState(rootNode, code, fRoutes, fAreas)
    }
    return await Promise.resolve()
  }))

  console.log('Calculating stats and geo data...')
  await visitAll()
  console.log('Done.')

  gracefulExit()
  return await Promise.resolve()
}
const seedState = async (root: AreaNode, stateCode: string, fileClimbs: string, fileAreas: string): Promise<void> => {
  const tmpClimbs = `_${stateCode}_tmp_climbs`
  await _dropCollection(tmpClimbs)

  const areaModel: mongoose.Model<AreaType> = createAreaModel('areas')
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(tmpClimbs)
  const stats = await Promise.all([
    loadClimbs(fileClimbs, climbModel),
    loadAreas(root, fileAreas, areaModel)
  ])
  console.log('Document loaded ', stateCode, stats)

  await addClimbsToAreas(climbModel, areaModel)
  console.log('Added climbs to crags', stateCode)
  console.log('Dropping temp collections ', stateCode)
  await _dropCollection(tmpClimbs)
  console.log('Completed', stateCode)
  return await Promise.resolve()
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await mongoose.connection.db.dropCollection(name)
  } catch (e) {
  }
}

const loadClimbs = async (fileName: string, model: mongoose.Model<ClimbType>): Promise<number> => {
  let count = 0
  const chunkSize = 100
  let chunk: ClimbType[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(fileName),
    terminal: false
  })

  for await (const line of rl) {
    const jsonLine = JSON.parse(line)
    const record = transformClimbRecord(jsonLine)
    chunk.push(record)
    if (chunk.length % chunkSize === 0) {
      count = count + chunk.length
      await model.insertMany(chunk, { ordered: false })
      chunk = []
    }
  }

  if (chunk.length > 0) {
    count = count + chunk.length
    await model.insertMany(chunk, { ordered: false })
  }
  return count
}

const loadAreas = async (root: AreaNode, fileName: string, model: mongoose.Model<AreaType>): Promise<number> => {
  const buffer: any[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(fileName),
    terminal: false
  })

  for await (const line of rl) {
    buffer.push(JSON.parse(line))
  }

  return await createAreas(root, buffer, model)
}

connectDB(main)
