import { connectDB, createAreaModel } from '../index'
import { Model, connection } from 'mongoose'
import { loadAreas } from './utils'
import { AreaType } from '../AreaTypes'
import { linkAreas } from './LinkParent'

const contentDir: string = process.env.CONTENT_BASEDIR ?? ''

if (contentDir === '') {
  console.log('Missing CONTENT_BASEDIR env')
  process.exit(1)
}

const main = async (): Promise<void> => {
  await connectDB()

  const tmpArea = '_tmp_areas'
  await _dropCollection(tmpArea)

  const areaModel: Model<AreaType> = createAreaModel(tmpArea)

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
  await connection.db.renameCollection(tmpArea, 'areas')
  console.log('Done.')
}

const _dropCollection = async (name: string): Promise<void> => {
  try {
    await connection.db.dropCollection(name)
  } catch (e) { }
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function (): Promise<void> {
  await main()
  process.exit(0)
})()
