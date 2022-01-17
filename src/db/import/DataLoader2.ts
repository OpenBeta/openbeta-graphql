import { pipeline } from 'stream/promises'

import { connectDB, gracefulExit, createAreaModel } from '../index.js'
import mongoose from 'mongoose'
import { AreaType } from '../AreaTypes.js'
import { linkAreas } from './LinkParent.js'
import { createClimbModel } from '../ClimbSchema.js'
import { ClimbType } from '../ClimbTypes.js'
import transformClimbRecord from './ClimbTransformer.js'

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

  // const areaModel: mongoose.Model<AreaType> = createAreaModel(tmpAreas)
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(tmpClimbs)
  // let areaCount = 0
  let climbCount = 0

  const chunkSize = 100
  let chunk: ClimbType[] = []

  const rl = readline.createInterface({
    input: fs.createReadStream(contentDir + '/climbs/ca-routes.jsonlines'),
    terminal: false
  })

  for await (const line of rl) {
    climbCount = climbCount + 1
    const climb = transformClimbRecord(JSON.parse(line))
    chunk.push(climb)
    if (chunk.length >= chunkSize) {
      await climbModel.insertMany(chunk, { ordered: false })
      chunk = []
    }
  }

  if (chunk.length > 0) {
    await climbModel.insertMany(chunk, { ordered: false })
  }

  /* eslint-disable-next-line */
  // stream.on('line', async (line: string): Promise<void> => {
  //   const climb = transformClimbRecord(JSON.parse(line))
  //   chunk.push(climb)
  //   climbCount = climbCount + 1
  //   console.log('chunk', chunk.length)
  //   // await climbModel.insertMany(climb, { ordered: false })
  //   if (chunk.length >= chunkSize) {
  //     console.log('Inserting', climbCount)
  //     stream.pause()
  //     await climbModel.insertMany(chunk, { ordered: false })
  //     chunk = []
  //     stream.resume()
  //   }
  // })

  // /* eslint-disable-next-line */
  // stream.on('end', async () => {
  //   console.log('end', chunk)
  //   if (chunk.length > 0) {
  //     stream.pause()
  //     console.log('Inserting ', chunk.length)
  //     await climbModel.insertMany(chunk, { ordered: false })
  //     stream.resume()
  //   }
  // })

  console.log('Content basedir: ', contentDir)
  // console.log('Areas Loaded ', areaCount)
  console.log('Climbs Loaded ', climbCount)

  // await linkAreas(tmpAreas)
  console.log('Areas linked')
  console.log('Dropping old collections...')
  // await _dropCollection('areas')
  // await mongoose.connection.db.renameCollection(tmpAreas, 'areas')
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

connectDB(main)

// const readline = require('readline');
// const fs = require('node:fs')
// //var x = []
// readline.createInterface({
//     input: fs.createReadStream('./climbs/ca-routes.jsonlines'),
//     terminal: false
// }).on('line', function(line) {
//     const climb = JSON.parse(line);
//     //x.push(log['id']);
//     console.log(climb['route_name'])
// });
