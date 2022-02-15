import mongoose from 'mongoose'
import readline from 'node:readline'
import fs from 'node:fs'

import { createAreaModel } from '../../index.js'
import { AreaType } from '../../AreaTypes.js'
import { addClimbsToAreas } from './AddClimbsToCrags.js'
import { createClimbModel } from '../../ClimbSchema.js'
import { ClimbType } from '../../ClimbTypes.js'
import transformClimbRecord from '../ClimbTransformer.js'
import { createAreas } from './AreaTransformer.js'
import { AreaNode } from './AreaTree.js'

export interface JobStats {
  state: string
  areaCount: number
  climbCount: number
}

export const seedState = async (root: AreaNode, stateCode: string, fileClimbs: string, fileAreas: string): Promise<JobStats> => {
  console.time('Loaded ' + stateCode)

  const tmpClimbs = `_${stateCode}_tmp_climbs`
  await dropCollection(tmpClimbs)

  const areaModel: mongoose.Model<AreaType> = createAreaModel('areas')
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(tmpClimbs)

  const stats = await Promise.all([
    loadClimbs(fileClimbs, climbModel),
    loadAreas(root, fileAreas, areaModel)
  ])

  await addClimbsToAreas(climbModel, areaModel)

  await dropCollection(tmpClimbs)

  console.timeEnd('Loaded ' + stateCode)

  return await Promise.resolve({ state: stateCode, climbCount: stats[0], areaCount: stats[1] })
}

export const dropCollection = async (name: string): Promise<void> => {
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
