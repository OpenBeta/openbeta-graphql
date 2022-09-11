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
    await createIndexes()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a country by Alpha-3 country code', async () => {
    const spain = await areas.addCountry(testUser, 'esP')
    const newArea = await areas.findOneAreaByUUID(spain.metadata.area_id)
    expect(newArea.area_name).toEqual('Spain')
    expect(newArea.shortCode).toEqual('ESP')
  })

  it('should create a country by Alpha-2 country code', async () => {
    const country = await areas.addCountry(testUser, 'ch')
    expect(country.area_name).toEqual('Switzerland')
    expect(country.shortCode).toEqual('CHE')
  })

  it('should create a country and 2 subareas', async () => {
    const canada = await areas.addCountry(testUser, 'can')
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

    // Verify paths and ancestors
    if (theBug != null) { // make TS happy
      expect(theBug.ancestors)
        .toEqual(`${canada.metadata.area_id.toUUID().toString()},${theBug?.metadata.area_id.toUUID().toString()}`)
      expect(theBug.pathTokens)
        .toEqual([canada.area_name, theBug.area_name])
    }
  })

  it('should create an area using only country code (without parent id)', async () => {
    const country = await areas.addCountry(testUser, 'za')
    const area = await areas.addArea(testUser, 'Table mountain', null, 'zaf')

    const countryInDb = await areas.findOneAreaByUUID(country.metadata.area_id)
    expect(countryInDb.children.length).toEqual(1)
    expect(countryInDb.children[0]).toEqual(area?._id)
  })

  it('should delete a subarea', async () => {
    const us = await areas.addCountry(testUser, 'usa')
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
    expect(theValleyInDb).toBeNull()

    caliInDb = await areas.findOneAreaByUUID(cali.metadata.area_id)
    expect(caliInDb.children.length).toEqual(0)
  })

  it('should not delete a subarea containing children', async () => {
    const gr = await areas.addCountry(testUser, 'grc')
    const kali = await areas.addArea(testUser, 'Kalymnos', gr.metadata.area_id)

    if (kali == null) fail()

    const arhi = await areas.addArea(testUser, 'Arhi', kali.metadata.area_id)

    if (arhi == null) fail()

    // Try to delete 'Arhi' (expecting exception)
    await expect(areas.deleteArea(testUser, kali.metadata.area_id)).rejects.toThrow('subareas not empty')

    const arhiInDb = await areas.findOneAreaByUUID(arhi.metadata.area_id)
    expect(arhiInDb._id).toEqual(arhi._id)
  })

  it('should not create duplicate countries', async () => {
    await areas.addCountry(testUser, 'ita')
    await expect(areas.addCountry(testUser, 'ita')).rejects.toThrow('E11000 duplicate key error')
  })

  it('should not create duplicate sub-areas', async () => {
    const fr = await areas.addCountry(testUser, 'fra')
    await areas.addArea(testUser, 'Verdon Gorge', fr.metadata.area_id)
    await expect(areas.addArea(testUser, 'Verdon Gorge', fr.metadata.area_id))
      .rejects.toThrow('E11000 duplicate key error')
  })

  it('should fail when calling without a parent country', async () => {
    await expect(areas.addArea(testUser, 'Peak District ', null, 'GB'))
      .rejects.toThrow()
  })

  it('should fail when calling with a non-existent parent id', async () => {
    const notInDb = muuid.from('abf6cb8b-8461-45c3-b46b-5997444be867')
    await expect(areas.addArea(testUser, 'Land\'s End ', notInDb))
      .rejects.toThrow()
  })

  it('should fail when calling with null parents', async () => {
    await expect(areas.addArea(testUser, 'Land\'s End ', null, '1q1'))
      .rejects.toThrow()
  })
})
