import mongoose from 'mongoose'
import readline from 'node:readline'
import fs from 'node:fs'

import { getAreaModel } from '../../index'
import { AreaType } from '../../AreaTypes'
import { linkClimbsWithAreas } from './LinkClimbsWithCrags'
import { getClimbModel } from '../../ClimbSchema'
import { ClimbType } from '../../ClimbTypes'
import transformClimbRecord from '../ClimbTransformer'
import { createAreas } from './AreaTransformer'
import { AreaNode } from './AreaTree'
import { logger } from '../../../logger'

export interface JobStats {
  state: string
  areaCount: number
  climbCount: number
}

export const seedState = async (root: AreaNode, stateCode: string, fileClimbs: string, fileAreas: string): Promise<JobStats> => {
  console.time('Loaded ' + stateCode)

  const areaModel: mongoose.Model<AreaType> = getAreaModel('areas')
  const climbModel: mongoose.Model<ClimbType> = getClimbModel('climbs')
  logger.info('start', stateCode)
  const stats = await Promise.all([
    loadClimbs(fileClimbs, climbModel),
    loadAreas(root, fileAreas, areaModel)
  ])
  logger.info('link', stateCode)
  await linkClimbsWithAreas(climbModel, areaModel)

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
