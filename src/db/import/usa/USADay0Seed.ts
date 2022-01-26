import { connectDB, gracefulExit, createAreaModel } from '../../index.js'
import mongoose from 'mongoose'
import { AreaType } from '../../AreaTypes.js'
import { addClimbsToAreas } from './AddClimbsToCrags.js'
import { createClimbModel } from '../../ClimbSchema.js'
import { ClimbType } from '../../ClimbTypes.js'
import transformClimbRecord from '../ClimbTransformer.js'
import { createAreas } from './AreaTransformer.js'
import US_STATES from './us-states.js'
import readline from 'node:readline'
import fs from 'node:fs'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  await _dropCollection('areas')
  // [{ code: 'OR' }])
  for await (const state of US_STATES) {
    const code = state.code.toLowerCase()
    const fRoutes = `${contentDir}/${code}-routes.jsonlines`
    const fAreas = `${contentDir}/${code}-areas.jsonlines`
    if (fs.existsSync(fRoutes) && fs.existsSync(fAreas)) {
      console.log('Loading beginning: ', code)
      await seedState(code, fRoutes, fAreas)
    }
  }
  gracefulExit()
  return await Promise.resolve()
}
const seedState = async (code: string, fileClimbs: string, fileAreas: string): Promise<void> => {
  const tmpClimbs = `_${code}_tmp_climbs`
  // const tmpAreas = '_tmp_areas'
  // await _dropCollection('areas')
  await _dropCollection(tmpClimbs)

  const areaModel: mongoose.Model<AreaType> = createAreaModel('areas')
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(tmpClimbs)
  const stats = await Promise.all([
    loadClimbs(fileClimbs, climbModel),
    loadAreas(fileAreas, areaModel)
  ])
  console.log('Document loaded ', code, stats)

  await addClimbsToAreas(climbModel, areaModel)
  console.log('Added climbs to crags', code)
  console.log('Dropping temp collections ', code)
  // await _dropCollection('areas')
  // await mongoose.connection.db.renameCollection(tmpAreas, 'areas')
  await _dropCollection(tmpClimbs)
  // await mongoose.connection.db.renameCollection(tmpClimbs, 'climbs')
  console.log('Completed', code)
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await mongoose.connection.db.dropCollection(name)
  } catch (e) {
    console.log(name, e)
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

const loadAreas = async (fileName: string, model: mongoose.Model<AreaType>): Promise<number> => {
  const buffer: any[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(fileName),
    terminal: false
  })

  for await (const line of rl) {
    buffer.push(JSON.parse(line))
  }

  return await createAreas(buffer, model)
}

connectDB(main)
