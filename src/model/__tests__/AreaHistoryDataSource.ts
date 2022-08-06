import mongoose from 'mongoose'
import { ChangeStream } from 'mongodb'
import { jest } from '@jest/globals'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel } from '../../db/index.js'
import streamListener from '../../db/edit/streamListener'
import { logger } from '../../logger.js'
import { changelogDataSource } from '../ChangeLogDataSource'
import { OperationType } from '../../db/AreaTypes'

jest.setTimeout(30000)

describe('Area history', () => {
  let areas: MutableAreaDataSource
  let stream: ChangeStream

  beforeAll(async () => {
    await connectDB()

    stream = await streamListener(mongoose.connection)

    try {
      await getAreaModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    await changelogDataSource._testRemoveAll()

    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
  })

  afterAll(async () => {
    try {
      await stream.close()
      await mongoose.disconnect()
    } catch (e) {
      console.log('closing mongoose', e)
    }
  })

  it('should create history records for new country and subareas', async () => {
    const usa = await areas.addCountry('us')
    await createIndexes()
    const newArea = await areas.findOneAreaByUUID(usa.metadata.area_id)
    expect(newArea.area_name).toEqual(usa.area_name)

    const nv = await areas.addArea('nevada', usa.metadata.area_id)
    const or = await areas.addArea('oregon', usa.metadata.area_id)

    expect(nv?._id).toBeTruthy()
    expect(or?._id).toBeTruthy()

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 5000))

    const areaHistory = await changelogDataSource.getAreaChangeSets()

    expect(areaHistory).toHaveLength(3)
    expect(areaHistory[0].operation).toEqual(OperationType.addCountry)
    expect(areaHistory[1].operation).toEqual(OperationType.addArea)
    expect(areaHistory[2].operation).toEqual(OperationType.addArea)

    const newCountryChange = areaHistory[0].changes
    expect(newCountryChange).toHaveLength(1)
    expect(newCountryChange[0].dbOp).toEqual('insert')
    expect(newCountryChange[0].fullDocument.area_name).toEqual(usa.area_name)

    // Verify NV history
    const nvAreaHistory = areaHistory[1].changes
    expect(nvAreaHistory).toHaveLength(2)

    // history is shown most recent first
    expect(nvAreaHistory[0].dbOp).toEqual('update') // add area to country.children[]
    expect(nvAreaHistory[0].fullDocument.area_name).toEqual(usa?.area_name)
    expect(nvAreaHistory[1].dbOp).toEqual('insert') // insert new area
    expect(nvAreaHistory[1].fullDocument.area_name).toEqual(nv?.area_name) // area added to the right parent?

    expect(nvAreaHistory[0].fullDocument.children).toHaveLength(1)
    expect(nvAreaHistory[0].fullDocument.children[0]).toEqual(nv?._id) // area added to parent.children[]?

    // Verify OR history
    const orAreaHistory = areaHistory[2].changes
    expect(orAreaHistory).toHaveLength(2)

    const usaHistory = await changelogDataSource.getAreaChangeSets(usa.metadata.area_id)
    console.log(usaHistory)
    // expect(usaHistory).toHaveLength(3)
  })

  // it('should record multiple Areas.setDestination() calls ', async () => {
  //   const canada = await areas.addCountry('ca')
  //   const squamish = await areas.addArea('squamish', canada.metadata.area_id)

  //   expect(squamish?._id).toBeTruthy()

  //   if (squamish != null) {
  //     const areaUuid = squamish.metadata.area_id
  //     await areas.setDestinationFlag(areaUuid, true)
  //     await areas.setDestinationFlag(areaUuid, false)

  //     // eslint-disable-next-line
  //     await new Promise(res => setTimeout(res, 3000))

  //     const history = await areaHistory.getChangesByUuid(areaUuid)

  //     expect(history).toHaveLength(3)
  //     expect(history[0].change.fullDocument.metadata.isDestination).toStrictEqual(false)
  //     expect(history[1].change.fullDocument.metadata.isDestination).toStrictEqual(true)
  //     expect(history[2].change.fullDocument.metadata.isDestination).toStrictEqual(false)
  //   }
  // })

  // it('should record an Areas.deleteArea() call', async () => {
  //   const greece = await areas.addCountry('gr')
  //   const leonidio = await areas.addArea('Leonidio', greece.metadata.area_id)

  //   if (leonidio == null) fail()

  //   await areas.deleteArea(leonidio.metadata.area_id)

  //   // eslint-disable-next-line
  //   await new Promise(res => setTimeout(res, 3000))

  //   const history = await areaHistory.getChangesByUuid(leonidio.metadata.area_id)

  //   expect(history).toHaveLength(2)
  //   expect(history[0].actionType).toEqual('insert')
  //   expect(history[0].change.fullDocument.area_name).toEqual(leonidio.area_name)
  //   expect(history[1].actionType).toEqual('delete')
  //   expect(history[1].change.fullDocument.area_name).toEqual(leonidio.area_name)
  // })

  // it('should not record a failed Areas.deleteArea() call', async () => {
  //   const spain = await areas.addCountry('es')
  //   const margalef = await areas.addArea('margalef', spain.metadata.area_id)

  //   if (margalef == null) fail()

  //   let deleted = false
  //   try {
  //     await areas.deleteArea(spain.metadata.area_id)
  //     fail('Shouldn\'t allow deletion when the area still has subareas')
  //   } catch (e) {
  //     deleted = true
  //   }

  //   expect(deleted).toBeTruthy()

  //   // eslint-disable-next-line
  //   await new Promise(res => setTimeout(res, 3000))

  //   const history = await areaHistory.getChangesByUuid(spain.metadata.area_id)

  //   // should only have 2 entries:
  //   // 1. Add country
  //   // 2. Add child to country
  //   expect(history).toHaveLength(2)
  // })
})
