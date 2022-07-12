import mongoose from 'mongoose'
import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB } from '../../db/index.js'

jest.setTimeout(30000)

describe('Areas', () => {
  let areas: MutableAreaDataSource

  beforeAll(async () => {
    await connectDB()

    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
    console.log('#connected')
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a country ISO code', async () => {
    const canada = await areas.addCountry('ca')

    const bc = await areas.addArea('British Columbia', canada.metadata.area_id)
    console.log('#canada', canada)
    console.log('#BC', bc)

    await areas.deleteArea(bc.metadata.area_id)
    const deleted = await areas.deleteArea(canada.metadata.area_id)
    console.log('#####deleted', deleted)
  })
})
