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
  const climb = 'climbs'
  const tmpArea = '_tmp_areas'
  await _dropCollection(tmpArea)
  await _dropCollection(climb)

  const areaModel: mongoose.Model<AreaType> = createAreaModel(tmpArea)
  const climbModel: mongoose.Model<ClimbType> = createClimbModel(climb)
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

  await linkAreas(tmpArea)
  console.log('Areas linked')
  console.log('Dropping old collection...')
  await _dropCollection('areas')

  await mongoose.connection.db.renameCollection(tmpArea, 'areas')
  // await mongoose.connection.db.renameCollection(tmpClimb, 'climbs')
  console.log('Done.')
  gracefulExit()
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await mongoose.connection.db.dropCollection(name)
  } catch (e) { }
}

connectDB(main)
