import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { geometry } from '@turf/helpers'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import MutableClimbDataSource from '../MutableClimbDataSource.js'
import { connectDB, createIndexes, getAreaModel, getClimbModel } from '../../db/index.js'
import { AreaEditableFieldsType, UpdateSortingOrderType } from '../../db/AreaTypes.js'

describe('Areas', () => {
  let areas: MutableAreaDataSource
  let climbs: MutableClimbDataSource
  const testUser = muuid.v4()

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getClimbModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test', e)
    }
    await createIndexes()
    areas = MutableAreaDataSource.getInstance()
    climbs = MutableClimbDataSource.getInstance()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create a country by Alpha-3 country code', async () => {
    const spain = await areas.addCountry('esP')
    const newArea = await areas.findOneAreaByUUID(spain.metadata.area_id)
    expect(newArea.area_name).toEqual('Spain')
    expect(newArea.shortCode).toEqual('ESP')
  })

  it('should create a country by Alpha-2 country code', async () => {
    const country = await areas.addCountry('ch')
    expect(country.area_name).toEqual('Switzerland')
    expect(country.shortCode).toEqual('CHE')
  })

  it('should create a country and 2 subareas', async () => {
    const canada = await areas.addCountry('can')
    // Add 1st area to the country
    const bc = await areas.addArea(testUser, 'British Columbia', canada.metadata.area_id)

    if (bc == null || canada == null) {
      fail()
    }
    expect(canada.metadata.lnglat).not.toMatchObject(geometry('Point', [0, 0]))
    expect(bc.area_name).toEqual('British Columbia')

    expect(bc.metadata.lnglat).toEqual(canada.metadata.lnglat)

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

  it('should allow adding child areas to empty leaf area', async () => {
    let parent = await areas.addArea(testUser, 'My house', null, 'can')
    await areas.updateArea(testUser, parent.metadata.area_id, { isLeaf: true, isBoulder: true })

    const newClimb = await climbs.addOrUpdateClimbs(testUser, parent.metadata.area_id, [{ name: 'Big Mac' }])

    // Try to add a new area when there's already a climb
    await expect(areas.addArea(testUser, 'Kitchen', parent.metadata.area_id)).rejects.toThrow(/Adding new areas to a leaf or boulder area is not allowed/)

    // Now remove the climb to see if we can add the area

    await climbs.deleteClimbs(testUser, parent.metadata.area_id, [muuid.from(newClimb[0])])
    await areas.addArea(testUser, 'Kitchen', parent.metadata.area_id)

    // Reload the parent
    parent = await areas.findOneAreaByUUID(parent.metadata.area_id)
    expect(parent.climbs).toHaveLength(0)
    expect(parent.children).toHaveLength(1)
    // make sure leaf and boulder flag are cleared
    expect(parent.metadata.leaf).toBeFalsy()
    expect(parent.metadata.isBoulder).toBeFalsy()
  })

  it('should create an area using only country code (without parent id)', async () => {
    const country = await areas.addCountry('za')
    const area = await areas.addArea(testUser, 'Table mountain', null, 'zaf')

    const countryInDb = await areas.findOneAreaByUUID(country.metadata.area_id)
    expect(countryInDb.children.length).toEqual(1)
    expect(countryInDb.children[0]).toEqual(area?._id)
  })

  it('should set crag/boulder attribute when adding new areas', async () => {
    let parent = await areas.addArea(testUser, 'Boulder A', null, 'can', undefined, false, true)
    expect(parent.metadata.isBoulder).toBe(true)
    expect(parent.metadata.leaf).toBe(true)

    parent = await areas.addArea(testUser, 'Sport A', null, 'can', undefined, true, undefined)
    expect(parent.metadata.isBoulder).toBe(false)
    expect(parent.metadata.leaf).toBe(true)
  })

  it('should update multiple fields', async () => {
    await areas.addCountry('au')
    const a1 = await areas.addArea(testUser, 'One', null, 'au')

    if (a1 == null) {
      fail()
    }
    // for testing area desccription is sanitized
    const iframeStr = '<iframe src="https://www.googlecom" title="Evil Iframe"></iframe>'
    const doc1: AreaEditableFieldsType = {
      areaName: '1',
      shortCode: 'ONE',
      description: `This is a cool area with some malicious code.${iframeStr}`,
      isDestination: true
    }
    let a1Updated = await areas.updateArea(testUser, a1?.metadata.area_id, doc1)

    expect(a1Updated?.area_name).toEqual(doc1.areaName)
    expect(a1Updated?.shortCode).toEqual(doc1.shortCode)
    // make sure area description is sanitized
    expect(a1Updated?.content.description).toEqual(doc1.description?.replace(iframeStr, ''))
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
    const country = await areas.addCountry('lao')
    if (country == null) fail()
    await expect(areas.updateArea(testUser, country.metadata.area_id, { areaName: 'Foo' })).rejects.toThrowError()

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    await expect(areas.updateArea(testUser, country.metadata.area_id, { shortCode: 'Foo' })).rejects.toThrowError()
  })

  it('should delete a subarea', async () => {
    const usa = await areas.addCountry('usa')
    const ca = await areas.addArea(testUser, 'CA', usa.metadata.area_id)
    const or = await areas.addArea(testUser, 'OR', usa.metadata.area_id)
    const wa = await areas.addArea(testUser, 'WA', usa.metadata.area_id)

    if (ca == null || or == null || wa == null) {
      fail('Child area is null')
    }

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 3000))

    let usaInDB = await areas.findOneAreaByUUID(usa.metadata.area_id)
    // verify number of child areas in parent
    expect(usaInDB.children as any[]).toHaveLength(3)

    // verify child area IDs in parent
    expect(usaInDB.children).toEqual([
      ca._id,
      or._id,
      wa._id
    ])

    await areas.deleteArea(testUser, ca.metadata.area_id)

    usaInDB = await areas.findOneAreaByUUID(usa.metadata.area_id)

    // verify child area IDs (one less than before)
    expect(usaInDB.children as any[]).toHaveLength(2)
    expect(usaInDB.children).toEqual([
      or._id,
      wa._id
    ])

    await expect(areas.findOneAreaByUUID(ca.metadata.area_id)).rejects.toThrow(/Area.*not found/)
  })

  it('should not delete a subarea containing children', async () => {
    const gr = await areas.addCountry('grc')
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
    await areas.addCountry('ita')

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    await expect(areas.addCountry('ita')).rejects.toThrowError('E11000 duplicate key error')
  })

  it('should not create duplicate sub-areas', async () => {
    const fr = await areas.addCountry('fra')
    await areas.addArea(testUser, 'Verdon Gorge', fr.metadata.area_id)
    await expect(areas.addArea(testUser, 'Verdon Gorge', fr.metadata.area_id))
      .rejects.toThrowError('E11000 duplicate key error')
  })

  it('should fail when adding without a parent country', async () => {
    await expect(areas.addArea(testUser, 'Peak District ', null, 'GB'))
      .rejects.toThrowError()
  })

  it('should fail when adding with a non-existent parent id', async () => {
    const notInDb = muuid.from('abf6cb8b-8461-45c3-b46b-5997444be867')
    await expect(areas.addArea(testUser, 'Land\'s End ', notInDb))
      .rejects.toThrowError()
  })

  it('should fail when adding with null parents', async () => {
    await expect(areas.addArea(testUser, 'Land\'s End ', null, '1q1'))
      .rejects.toThrowError()
  })

  it('should update areas sorting order', async () => {
    // Setup
    await areas.addCountry('MX')
    const a1 = await areas.addArea(testUser, 'A1', null, 'MX')
    const a2 = await areas.addArea(testUser, 'A2', null, 'MX')

    const change1: UpdateSortingOrderType = {
      areaId: a1.metadata.area_id.toUUID().toString(),
      leftRightIndex: 10
    }
    const change2: UpdateSortingOrderType = {
      areaId: a2.metadata.area_id.toUUID().toString(),
      leftRightIndex: 9
    }

    // Update
    await areas.updateSortingOrder(testUser, [change1, change2])

    // Verify
    const a1Actual = await areas.findOneAreaByUUID(a1.metadata.area_id)
    expect(a1Actual).toEqual(
      expect.objectContaining({
        area_name: a1.area_name,
        metadata: expect.objectContaining({
          leftRightIndex: change1.leftRightIndex
        })
      }))

    const a2Actual = await areas.findOneAreaByUUID(a2.metadata.area_id)
    expect(a2Actual).toEqual(
      expect.objectContaining({
        area_name: a2.area_name,
        metadata: expect.objectContaining({
          leftRightIndex: change2.leftRightIndex
        })
      }))
  })

  it('should update self and childrens pathTokens', async () => {
    await areas.addCountry('JP')
    const a1 = await areas.addArea(testUser, 'Parent', null, 'JP')
    const b1 = await areas.addArea(testUser, 'B1', a1.metadata.area_id)
    const b2 = await areas.addArea(testUser, 'B2', a1.metadata.area_id)
    const c1 = await areas.addArea(testUser, 'C1', b1.metadata.area_id)
    const c2 = await areas.addArea(testUser, 'C2', b1.metadata.area_id)
    const c3 = await areas.addArea(testUser, 'C3', b2.metadata.area_id)
    const e1 = await areas.addArea(testUser, 'E1', c3.metadata.area_id)

    let a1Actual = await areas.findOneAreaByUUID(a1.metadata.area_id)
    expect(a1Actual).toEqual(
      expect.objectContaining({
        area_name: 'Parent',
        pathTokens: ['Japan', 'Parent']
      }))

    let b1Actual = await areas.findOneAreaByUUID(b1.metadata.area_id)
    expect(b1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B1']
      }))

    let b2Actual = await areas.findOneAreaByUUID(b2.metadata.area_id)
    expect(b2Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B2']
      }))

    let c1Actual = await areas.findOneAreaByUUID(c1.metadata.area_id)
    expect(c1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B1', 'C1']
      }))

    let c2Actual = await areas.findOneAreaByUUID(c2.metadata.area_id)
    expect(c2Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B1', 'C2']
      }))

    let c3Actual = await areas.findOneAreaByUUID(c3.metadata.area_id)
    expect(c3Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B2', 'C3']
      }))

    let e1Actual = await areas.findOneAreaByUUID(e1.metadata.area_id)
    expect(e1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Parent', 'B2', 'C3', 'E1']
      }))

    // Update
    const doc1: AreaEditableFieldsType = {
      areaName: 'Test Name'
    }
    await areas.updateArea(testUser, a1?.metadata.area_id, doc1)

    // Verify
    a1Actual = await areas.findOneAreaByUUID(a1.metadata.area_id)
    expect(a1Actual).toEqual(
      expect.objectContaining({
        area_name: 'Test Name',
        pathTokens: ['Japan', 'Test Name']
      }))

    b1Actual = await areas.findOneAreaByUUID(b1.metadata.area_id)
    expect(b1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B1']
      }))

    b2Actual = await areas.findOneAreaByUUID(b2.metadata.area_id)
    expect(b2Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B2']
      }))

    c1Actual = await areas.findOneAreaByUUID(c1.metadata.area_id)
    expect(c1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B1', 'C1']
      }))

    c2Actual = await areas.findOneAreaByUUID(c2.metadata.area_id)
    expect(c2Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B1', 'C2']
      }))

    c3Actual = await areas.findOneAreaByUUID(c3.metadata.area_id)
    expect(c3Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B2', 'C3']
      }))

    e1Actual = await areas.findOneAreaByUUID(e1.metadata.area_id)
    expect(e1Actual).toEqual(
      expect.objectContaining({
        pathTokens: ['Japan', 'Test Name', 'B2', 'C3', 'E1']
      }))
  })
})
