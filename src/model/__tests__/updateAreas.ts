import muuid from 'uuid-mongodb'
import { geometry } from '@turf/helpers'
import countries from 'i18n-iso-countries'
import { AreaEditableFieldsType, UpdateSortingOrderType } from '../../db/AreaTypes.js'
import { dataFixtures as it } from '../../__tests__/fixtures/data.fixtures'
import { gradeContextToGradeScales } from '../../GradeUtils.js'

describe('Areas', () => {
  it('should create a country by Alpha-3 country code', async ({ areas, countryCode }) => {
    const country = await areas.addCountry(countryCode.toLocaleLowerCase())
    const newArea = await areas.findOneAreaByUUID(country.metadata.area_id)
    expect(newArea.area_name).toEqual(countries.getName(countryCode, 'en'))
    expect(newArea.shortCode).toEqual(countryCode)
  })

  it('should create a country by Alpha-2 country code', async ({ areas, countryCode }) => {
    const alpha2 = countries.alpha3ToAlpha2(countryCode)
    assert(alpha2)
    const country = await areas.addCountry(alpha2)
    expect(country.area_name).toEqual(countries.getName(countryCode, 'en'))
    // should be expanded to the long country code
    expect(country.shortCode).toEqual(countryCode)
  })

  it('should create a country and 2 subareas', async ({ areas, user, countryCode }) => {
    const country = await areas.addCountry(countryCode)
    // Add 1st area to the country
    const district = await areas.addArea(user, 'British Columbia', country.metadata.area_id)
    assert(district != null)
    assert(country != null)

    expect(country.metadata.lnglat).not.toMatchObject(geometry('Point', [0, 0]))
    expect(district.area_name).toEqual('British Columbia')

    expect(district.metadata.lnglat).toEqual(country.metadata.lnglat)

    let countryInDB = await areas.findOneAreaByUUID(country.metadata.area_id)

    expect(countryInDB.children.length).toEqual(1)
    expect(countryInDB.children[0]).toEqual(district?._id)

    // Add another area to the country
    const province = await areas.addArea(user, 'The Bugaboos', country.metadata.area_id)

    countryInDB = await areas.findOneAreaByUUID(country.metadata.area_id)
    expect(countryInDB.children.length).toEqual(2)
    expect(countryInDB.children[1]).toEqual(province?._id)

    // Verify paths and ancestors
    assert(province !== null)

    expect(province.ancestors)
      .toEqual(`${country.metadata.area_id.toUUID().toString()},${province?.metadata.area_id.toUUID().toString()}`)
    expect(province.pathTokens)
      .toEqual([country.area_name, province.area_name])
  })

  it('should allow adding child areas to empty leaf area', async ({ areas, user, climbs, country, area }) => {
    await areas.updateArea(user, area.metadata.area_id, { isLeaf: true, isBoulder: true })

    gradeContextToGradeScales[country.gradeContext] = gradeContextToGradeScales.US
    const newClimb = await climbs.addOrUpdateClimbs(user, area.metadata.area_id, [{ name: 'Big Mac' }])

    // Try to add a new area when there's already a climb
    await expect(areas.addArea(user, 'Kitchen', area.metadata.area_id)).rejects.toThrow('Adding new areas to a leaf or boulder area is not allowed')

    // Now remove the climb to see if we can add the area
    await climbs.deleteClimbs(user, area.metadata.area_id, [muuid.from(newClimb[0])])
    await areas.addArea(user, 'Kitchen', area.metadata.area_id)

    // Reload the parent area
    area = await areas.findOneAreaByUUID(area.metadata.area_id)

    expect(area.climbs).toHaveLength(0)
    expect(area.children).toHaveLength(1)
    // make sure leaf and boulder flag are cleared
    expect(area.metadata.leaf).toBeFalsy()
    expect(area.metadata.isBoulder).toBeFalsy()
  })

  it('should create an area using only country code (without parent id)', async ({ areas, user, countryCode }) => {
    const country = await areas.addCountry(countryCode)
    const area = await areas.addArea(user, 'Table mountain', null, countryCode)

    const countryInDb = await areas.findOneAreaByUUID(country.metadata.area_id)
    expect(countryInDb.children.length).toEqual(1)
    expect(countryInDb.children[0]).toEqual(area?._id)
  })

  it('should set crag/boulder attribute when adding new areas', async ({ areas, user, country }) => {
    let parent = await areas.addArea(user, 'Boulder A', country.metadata.area_id, undefined, undefined, false, true)
    expect(parent.metadata.isBoulder).toBe(true)
    expect(parent.metadata.leaf).toBe(true)

    parent = await areas.addArea(user, 'Sport A', country.metadata.area_id, undefined, undefined, true, undefined)
    expect(parent.metadata.isBoulder).toBe(false)
    expect(parent.metadata.leaf).toBe(true)
  })

  it('should update multiple fields', async ({ areas, user, area }) => {
    // for testing area desccription is sanitized
    const iframeStr = '<iframe src="https://www.googlecom" title="Evil Iframe"></iframe>'
    const doc1: AreaEditableFieldsType = {
      areaName: '1',
      shortCode: 'ONE',
      description: `This is a cool area with some malicious code.${iframeStr}`,
      areaLocation: `This is a cool area location with some malicious code.${iframeStr}`,
      isDestination: true
    }
    let a1Updated = await areas.updateArea(user, area?.metadata.area_id, doc1)

    expect(a1Updated?.area_name).toEqual(doc1.areaName)
    expect(a1Updated?.shortCode).toEqual(doc1.shortCode)
    // make sure area description is sanitized
    expect(a1Updated?.content.description).toEqual(doc1.description?.replace(iframeStr, ''))
    // make sure area location is sanitized
    expect(a1Updated?.content.areaLocation).toEqual(doc1.areaLocation?.replace(iframeStr, ''))
    expect(a1Updated?.metadata.isDestination).toEqual(doc1.isDestination)

    const doc2: AreaEditableFieldsType = {
      isDestination: false,
      lat: 46.433333,
      lng: 11.85
    }
    a1Updated = await areas.updateArea(user, area?.metadata.area_id, doc2)
    expect(a1Updated?.metadata.lnglat).toEqual(geometry('Point', [doc2.lng, doc2.lat]))
    expect(a1Updated?.metadata.isDestination).toEqual(doc2.isDestination)
  })

  it('should not update country name and code', async ({ areas, user, country }) => {
    await expect(areas.updateArea(user, country.metadata.area_id, { areaName: 'Foo' })).rejects.toThrowError()
  })

  it('should delete a subarea', async ({ areas, user, country }) => {
    const ca = await areas.addArea(user, 'CA', country.metadata.area_id)
    const or = await areas.addArea(user, 'OR', country.metadata.area_id)
    const wa = await areas.addArea(user, 'WA', country.metadata.area_id)

    assert(ca != null, 'child area is null')
    assert(or != null, 'child area is null')
    assert(wa != null, 'child area is null')

    //
    // await new Promise(res => setTimeout(res, 3000))

    let usaInDB = await areas.findOneAreaByUUID(country.metadata.area_id)
    // verify number of child areas in parent
    expect(usaInDB.children as any[]).toHaveLength(3)

    // verify child area IDs in parent
    expect(usaInDB.children).toEqual([
      ca._id,
      or._id,
      wa._id
    ])

    await areas.deleteArea(user, ca.metadata.area_id)

    usaInDB = await areas.findOneAreaByUUID(country.metadata.area_id)

    // verify child area IDs (one less than before)
    expect(usaInDB.children as any[]).toHaveLength(2)
    expect(usaInDB.children).toEqual([
      or._id,
      wa._id
    ])

    await expect(areas.findOneAreaByUUID(ca.metadata.area_id)).rejects.toThrow(/Area.*not found/)
  })

  it('should not delete a subarea containing children', async ({ areas, user, countryCode }) => {
    const country = await areas.addCountry(countryCode)
    const province = await areas.addArea(user, 'Kalymnos', country.metadata.area_id)

    assert(province != null)

    const arhi = await areas.addArea(user, 'Arhi', province.metadata.area_id)

    assert(arhi != null)

    // Try to delete 'Arhi' (expecting exception)
    await expect(areas.deleteArea(user, province.metadata.area_id)).rejects.toThrow('subareas not empty')

    const arhiInDb = await areas.findOneAreaByUUID(arhi.metadata.area_id)
    expect(arhiInDb._id).toEqual(arhi._id)
  })

  it('should not create duplicate countries', async ({ areas, user, countryCode }) => {
    await areas.addCountry(countryCode)

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    await expect(areas.addCountry(countryCode)).rejects.toThrowError('This name already exists for some other area in this parent')
  })

  it('should not create duplicate sub-areas', async ({ areas, user, countryCode }) => {
    const country = await areas.addCountry(countryCode)
    await areas.addArea(user, 'Verdon Gorge', country.metadata.area_id)
    await expect(areas.addArea(user, 'Verdon Gorge', country.metadata.area_id))
      .rejects.toThrowError('This name already exists for some other area in this parent')
  })

  it('should fail when adding without a parent country', async ({ areas, user, climbs }) => {
    await expect(areas.addArea(user, 'Peak District ', null, 'GB'))
      .rejects.toThrowError()
  })

  it('should fail when adding with a non-existent parent id', async ({ areas, user, climbs }) => {
    const notInDb = muuid.from('abf6cb8b-8461-45c3-b46b-5997444be867')
    await expect(areas.addArea(user, 'Land\'s End ', notInDb))
      .rejects.toThrowError()
  })

  it('should fail when adding with null parents', async ({ areas, user, climbs }) => {
    await expect(areas.addArea(user, 'Land\'s End ', null, '1q1'))
      .rejects.toThrowError()
  })

  it('should update areas sorting order', async ({ areas, user, climbs }) => {
    // Setup
    await areas.addCountry('MX')
    const a1 = await areas.addArea(user, 'A1', null, 'MX')
    const a2 = await areas.addArea(user, 'A2', null, 'MX')

    const change1: UpdateSortingOrderType = {
      areaId: a1.metadata.area_id.toUUID().toString(),
      leftRightIndex: 10
    }
    const change2: UpdateSortingOrderType = {
      areaId: a2.metadata.area_id.toUUID().toString(),
      leftRightIndex: 9
    }

    // Update
    await areas.updateSortingOrder(user, [change1, change2])

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

  it('should update self and childrens pathTokens', async ({ areas, user, climbs }) => {
    await areas.addCountry('JP')
    const a1 = await areas.addArea(user, 'Parent', null, 'JP')
    const b1 = await areas.addArea(user, 'B1', a1.metadata.area_id)
    const b2 = await areas.addArea(user, 'B2', a1.metadata.area_id)
    const c1 = await areas.addArea(user, 'C1', b1.metadata.area_id)
    const c2 = await areas.addArea(user, 'C2', b1.metadata.area_id)
    const c3 = await areas.addArea(user, 'C3', b2.metadata.area_id)
    const e1 = await areas.addArea(user, 'E1', c3.metadata.area_id)

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
    await areas.updateArea(user, a1?.metadata.area_id, doc1)

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
