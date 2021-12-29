import { connectDB, gracefulExit, createAreaModel } from '../index.js'
import mongoose from 'mongoose'
import { loadAreas } from './utils.js'
import { AreaType } from '../AreaTypes.js'
import { linkAreas } from './LinkParent.js'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  const tmpArea = '_tmp_areas'
  await _dropCollection(tmpArea)

  const areaModel: mongoose.Model<AreaType> = createAreaModel(tmpArea)

  let i = 0
  await loadAreas(contentDir, async (area): Promise<void> => {
    i += 1
    await areaModel.insertMany(area, { ordered: false })
  })

  console.log('Content basedir: ', contentDir)
  console.log('Loaded ', i)

  await linkAreas(tmpArea)
  console.log('Areas linked')
  console.log('Dropping old collection...')
  await _dropCollection('areas')
  await mongoose.connection.db.renameCollection(tmpArea, 'areas')
  console.log('Done.')
  gracefulExit()
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await mongoose.connection.db.dropCollection(name)
  } catch (e) { }
}

connectDB(main)
