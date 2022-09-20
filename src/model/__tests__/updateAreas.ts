import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { geometry } from '@turf/helpers'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'
import { AreaEditableFieldsType } from '../../db/AreaTypes.js'

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

  it('should update multiple fields', async () => {
    await areas.addCountry(testUser, 'au')
    const a1 = await areas.addArea(testUser, 'One', null, 'au')

    if (a1 == null) {
      fail()
    }

    const doc1: AreaEditableFieldsType = {
      areaName: '1',
      shortCode: 'ONE',
      description: 'This is a cool area.',
      isDestination: true
    }
    let a1Updated = await areas.updateArea(testUser, a1?.metadata.area_id, doc1)

    expect(a1Updated?.area_name).toEqual(doc1.areaName)
    expect(a1Updated?.shortCode).toEqual(doc1.shortCode)
    expect(a1Updated?.content.description).toEqual(doc1.description)
    expect(a1Updated?.metadata.isDestination).toEqual(doc1.isDestination)

    const doc2: AreaEditableFieldsType = {
      isDestination: false,
      lat: 46.433333,
      lng: 11.85
    }
    a1Updated = await areas.updateArea(testUser, a1?.metadata.area_id, doc2)
    expect(a1Updated?.metadata.lnglat).toEqual(geometry('Point', [doc2.lng, doc2.lat]))
    expect(a1Updated?.metadata.isDestination).toEqual(doc2.isDestination)
  })

  it('should not update country name and code', async () => {
    const country = await areas.addCountry(testUser, 'lao')
    if (country == null) fail()
    await expect(areas.updateArea(testUser, country.metadata.area_id, { areaName: 'Foo' })).rejects.toThrowError()

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    await expect(areas.updateArea(testUser, country.metadata.area_id, { shortCode: 'Foo' })).rejects.toThrowError()
  })

  it('should delete a subarea', async () => {
    const usa = await areas.addCountry(testUser, 'usa')
    const ca = await areas.addArea(testUser, 'CA', usa.metadata.area_id)
    const or = await areas.addArea(testUser, 'OR', usa.metadata.area_id)
    const wa = await areas.addArea(testUser, 'WA', usa.metadata.area_id)

    if (ca == null || or == null || wa == null) {
      fail('Child area is null')
    }

    let usaInDB = await areas.findOneAreaByUUID(usa.metadata.area_id)

    // verify number of child areas in parent
    expect(usaInDB.children as any[]).toHaveLength(3)

    // verify child area IDs in parent
    expect(usaInDB.children).toMatchObject([
      muuid.from(ca.metadata.area_id).toUUID(),
      muuid.from(or.metadata.area_id).toUUID(),
      muuid.from(wa.metadata.area_id).toUUID()
    ])

    await areas.deleteArea(testUser, ca.metadata.area_id)

    usaInDB = await areas.findOneAreaByUUID(usa.metadata.area_id)
    // verify child area IDs (one less than before)
    expect(usaInDB.children as any[]).toHaveLength(2)
    expect(usaInDB.children).toMatchObject([
      muuid.from(or.metadata.area_id).toUUID(),
      muuid.from(wa.metadata.area_id).toUUID()
    ])

    const deletedAreaInDb = await areas.findOneAreaByUUID(ca.metadata.area_id)
    expect(deletedAreaInDb).toBeNull()
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
