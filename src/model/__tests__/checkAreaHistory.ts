import mongoose from 'mongoose'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes } from '../../db/index.js'
import streamListener from '../../db/edit/streamListener'

describe('Area history', () => {
  let areas: MutableAreaDataSource
  let stream
  beforeAll(async () => {
    await connectDB()

    try {
      await mongoose.connection.collection('climbs').drop()
      await mongoose.connection.collection('areas').drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
    stream = await streamListener(mongoose.connection)
  })

  afterAll(async () => {
    stream.close()
    await mongoose.connection.close()
  })


  it('should create a country by ISO code', async () => {
    const spain = await areas.addCountry('es')
    await createIndexes()
    const newArea = await areas.findOneAreaByUUID(spain.metadata.area_id)
    expect(newArea.area_name).toEqual(spain.area_name)
  })
})
