import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'

describe('Areas', () => {
  let areas: MutableAreaDataSource
  const testUser = muuid.v4()

  beforeAll(async () => {
    console.log('#BeforeAll Areas')
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getClimbModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a country by ISO code', async () => {
    const spain = await areas.addCountry(testUser, 'es')
    await createIndexes()
    const newArea = await areas.findOneAreaByUUID(spain.metadata.area_id)
    expect(newArea.area_name).toEqual(spain.area_name)
  })

  it('should create a country and 2 subareas', async () => {
    const canada = await areas.addCountry(testUser, 'ca')
    // Add 1st area to the country
    const bc = await areas.addArea(testUser, 'British Columbia', canada.metadata.area_id)

    expect(bc?.area_name).toEqual('British Columbia')

    let canadaInDb = await areas.findOneAreaByUUID(canada.metadata.area_id)

    expect(canadaInDb.children.length).toEqual(1)
    expect(canadaInDb.children[0]).toEqual(bc?._id)

    // Add another area to the country
    const theBug = await areas.addArea(testUser, 'The Bugaboos', canada.metadata.area_id)

    canadaInDb = await areas.findOneAreaByUUID(canada.metadata.area_id)
    expect(canadaInDb.children.length).toEqual(2)
    expect(canadaInDb.children[1]).toEqual(theBug?._id)
  })

  it('should delete a subarea', async () => {
    const us = await areas.addCountry(testUser, 'us')
    const cali = await areas.addArea(testUser, 'California', us.metadata.area_id)

    if (cali == null) {
      fail('California should not be null')
    }

    const theValley = await areas.addArea(testUser, 'Yosemite Valley', cali?.metadata.area_id)

    if (theValley == null) {
      fail('Yosemite Valley should not be null')
    }

    let caliInDb = await areas.findOneAreaByUUID(cali.metadata.area_id)
    expect(caliInDb.children.length).toEqual(1)

    const deletedArea = await areas.deleteArea(testUser, theValley.metadata.area_id)
    expect(deletedArea?.area_name).toEqual('Yosemite Valley')

    const theValleyInDb = await areas.findOneAreaByUUID(theValley?.metadata.area_id)
    expect(theValleyInDb._deleting).not.toEqual(0)

    caliInDb = await areas.findOneAreaByUUID(cali.metadata.area_id)
    expect(caliInDb.children.length).toEqual(0)
  })

  it('should not delete a subarea containing children', async () => {
    const gr = await areas.addCountry(testUser, 'gr')
    const kali = await areas.addArea(testUser, 'Kalymnos', gr.metadata.area_id)

    if (kali == null) fail()

    const arhi = await areas.addArea(testUser, 'Arhi', kali.metadata.area_id)

    if (arhi == null) fail()

    // Try to delete 'Arhi' (expecting exception)
    await expect(areas.deleteArea(testUser, kali.metadata.area_id)).rejects.toThrow('subareas not empty')

    const arhiInDb = await areas.findOneAreaByUUID(arhi.metadata.area_id)
    expect(arhiInDb._id).toEqual(arhi._id)
  })
})
