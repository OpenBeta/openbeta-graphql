import mongoose from 'mongoose'
import { jest } from '@jest/globals'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes } from '../../db/index.js'

jest.setTimeout(120000)

describe('Areas', () => {
  let areas: MutableAreaDataSource

  beforeAll(async () => {
    await connectDB()

    try {
      await mongoose.connection.collection('climbs').drop()
      await mongoose.connection.collection('areas').drop()
    } catch (e) {
      console.log('Cleaning up db before test')
    }
    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a country by ISO code', async () => {
    const spain = await areas.addCountry('es')
    await createIndexes()
    const newArea = await areas.findOneAreaByUUID(spain.metadata.area_id)
    expect(newArea.area_name).toEqual(spain.area_name)
  })

  it('should create a country and 2 subareas', async () => {
    const canada = await areas.addCountry('ca')
    // Add 1st area to the country
    const bc = await areas.addArea('British Columbia', canada.metadata.area_id)

    let canadaInDb = await areas.findOneAreaByUUID(canada.metadata.area_id)

    expect(canadaInDb.children.length).toEqual(1)
    expect(canadaInDb.children[0]).toEqual(bc._id)

    // Add another area to the country
    const theBug = await areas.addArea('The Bugaboos', canada.metadata.area_id)

    canadaInDb = await areas.findOneAreaByUUID(canada.metadata.area_id)
    expect(canadaInDb.children.length).toEqual(2)
    expect(canadaInDb.children[1]).toEqual(theBug._id)
  })

  it('should delete a subarea', async () => {
    const us = await areas.addCountry('us')
    const cali = await areas.addArea('California', us.metadata.area_id)
    const theValley = await areas.addArea('Yosemite Valley', cali.metadata.area_id)

    let caliInDb = await areas.findOneAreaByUUID(cali.metadata.area_id)
    expect(caliInDb.children.length).toEqual(1)

    await areas.deleteArea(theValley.metadata.area_id)

    const theValleyInDb = await areas.findOneAreaByUUID(theValley.metadata.area_id)
    expect(theValleyInDb._deleting).not.toEqual(0)

    caliInDb = await areas.findOneAreaByUUID(cali.metadata.area_id)
    expect(caliInDb.children.length).toEqual(0)
  })

  it('should not delete a subarea containing children', async () => {
    const gr = await areas.addCountry('gr')
    const kali = await areas.addArea('Kalymnos', gr.metadata.area_id)
    const arhi = await areas.addArea('Arhi', kali.metadata.area_id)

    // Try to delete 'Arhi' (expecting exception)
    await expect(areas.deleteArea(kali.metadata.area_id)).rejects.toThrow('subareas not empty')

    const arhiInDb = await areas.findOneAreaByUUID(arhi.metadata.area_id)
    expect(arhiInDb._id).toEqual(arhi._id)
  })
})
