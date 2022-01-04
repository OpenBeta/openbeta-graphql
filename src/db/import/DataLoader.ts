import { connectDB, gracefulExit, createAreaModel } from '../index.js'
import mongoose from 'mongoose'
import { loadAreas } from './utils.js'
import { AreaType } from '../AreaTypes.js'
import { linkAreas } from './LinkParent.js'
import { createClimbModel } from '../ClimbSchema.js'
import { ClimbType } from '../ClimbTypes.js'

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
  let areaCount = 0
  let climbCount = 0

  await loadAreas(contentDir, async (area, climbs): Promise<void> => {
    areaCount += 1
    climbCount += (climbs.length as number)

    await areaModel.insertMany(area, { ordered: false })
    await climbModel.insertMany(climbs, { ordered: false })
  })

  console.log('Content basedir: ', contentDir)
  console.log('Areas Loaded ', areaCount)
  console.log('Climbs Loaded ', climbCount)

  await linkAreas(tmpAreas)
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

connectDB(main)
