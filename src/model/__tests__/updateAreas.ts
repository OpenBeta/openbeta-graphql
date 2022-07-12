import mongoose from 'mongoose'
import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB } from '../../db/index.js'

let counter = 0
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
    console.log('##Counter ', counter)
    counter = counter + 1
    const canada = await areas.addCountry('ca')
    // const spain = await areas.addCountry('es')
    console.log('#canada', canada)

    const deleted = await areas.deleteArea(canada.metadata.area_id)
    console.log('#####deleted', deleted)
  })
})
