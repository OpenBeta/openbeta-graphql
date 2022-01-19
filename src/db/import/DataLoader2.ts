import { pipeline } from 'stream/promises'

import { connectDB, gracefulExit, createAreaModel } from '../index.js'
import mongoose from 'mongoose'
import { AreaType } from '../AreaTypes.js'
import { linkAreas } from './LinkParent.js'
import { createClimbModel } from '../ClimbSchema.js'
import { ClimbType } from '../ClimbTypes.js'
import transformClimbRecord from './ClimbTransformer.js'
import transformAreaRecord from './AreaTransformer.js'


import readline from 'node:readline'
import fs from 'node:fs'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const tmpClimbs = '_tmp_climbs'
  const tmpAreas = '_tmp_areas'
  await _dropCollection(tmpAreas)
  await _dropCollection(tmpClimbs)

  const areaModel: mongoose.Model<AreaType> = createAreaModel(tmpAreas)
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(tmpClimbs)

  const foos = await Promise.all([
    load<ClimbType>(contentDir + '/climbs/or-routes.jsonlines', transformClimbRecord, climbModel),
    load<AreaType>(contentDir + '/climbs/or-areas.jsonlines', transformAreaRecord, areaModel),
  ])

  console.log('Content basedir: ', contentDir)
  // console.log('Areas Loaded ', areaCount)
  console.log('Climbs Loaded ', foos)

  // await linkAreas(tmpAreas)
  console.log('Areas linked')
  console.log('Dropping old collections...')
  await _dropCollection('areas')
  await mongoose.connection.db.renameCollection(tmpAreas, 'areas')
  await _dropCollection('climbs')
  await mongoose.connection.db.renameCollection(tmpClimbs, 'climbs')
  console.log('Done.')
  gracefulExit()
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await mongoose.connection.db.dropCollection(name)
  } catch (e) { }
}

const load = async<T extends ClimbType|AreaType>(fileName: string, transformer: (row: any) => T, model: mongoose.Model<T>): Promise<number> => {
  let count = 0
  const chunkSize = 100
  let chunk: T[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(fileName),
    terminal: false
  })

  for await (const line of rl) {
    count = count + 1
    const record = transformer(JSON.parse(line))
    chunk.push(record)
    if (chunk.length >= chunkSize) {
      await model.insertMany(chunk, { ordered: false })
      chunk = []
    }
  }

  if (chunk.length > 0) {
    await model.insertMany(chunk, { ordered: false })
  }
  return count
}

connectDB(main)
