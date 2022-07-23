import mongoose from 'mongoose'
import { ChangeStream } from 'mongodb'
import { jest } from '@jest/globals'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getAreaHistoryModel } from '../../db/index.js'
import streamListener from '../../db/edit/streamListener'
import AreaHistoryDataSource from '../AreaHistoryDatasource.js'
import { logger } from '../../logger.js'

jest.setTimeout(10000)

describe('Area history', () => {
  let areas: MutableAreaDataSource
  let areaHistory: AreaHistoryDataSource
  let stream: ChangeStream

  beforeAll(async () => {
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getAreaHistoryModel().collection.drop()
    } catch (e) {
      logger.info('Expected exception')
    }

    areas = new MutableAreaDataSource(mongoose.connection.db.collection('areas'))
    areaHistory = new AreaHistoryDataSource(mongoose.connection.db.collection('area_histories'))
    stream = await streamListener(mongoose.connection)
  })

  afterAll(async () => {
    stream?.close()
    await mongoose.connection.close()
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
    await new Promise(res => setTimeout(res, 3000))

    const historyUSA = await areaHistory.getChangesByUuid(usa.metadata.area_id)

    expect(historyUSA).toHaveLength(3)
    expect(historyUSA[0].actionType).toEqual('insert') // new history record
    expect(historyUSA[1].actionType).toEqual('update') // add NV to children[]
    expect(historyUSA[2].actionType).toEqual('update') // add OR to children[]

    const change0 = historyUSA[0].change.fullDocument
    const change1 = historyUSA[1].change.fullDocument
    const change2 = historyUSA[2].change.fullDocument

    expect(change0.children.length).toEqual(0)

    expect(change1.children.length).toEqual(1)
    expect(change1.children[0]).toEqual(nv?._id)

    expect(change2.children.length).toEqual(2)
    expect(change2.children[1]).toEqual(or?._id)

    // Verify NV
    expect(nv?.metadata?.area_id).toBeTruthy()

    if (nv?.metadata.area_id != null) { // if clause to make TS happy
      const historyNV = await areaHistory.getChangesByUuid(nv.metadata.area_id)
      expect(historyNV).toHaveLength(1)
      expect(historyNV[0].actionType).toEqual('insert')
      expect(historyNV[0].change.fullDocument.area_name).toEqual(nv.area_name)
    }

    // Verify OR
    expect(or?.metadata?.area_id).toBeTruthy()

    if (or?.metadata.area_id != null) { // if clause to make TS happy
      const historyNV = await areaHistory.getChangesByUuid(or.metadata.area_id)
      expect(historyNV).toHaveLength(1)
      expect(historyNV[0].actionType).toEqual('insert')
      expect(historyNV[0].change.fullDocument.area_name).toEqual(or.area_name)
    }
  })

  it('should record multiple Areas.setDestination() calls ', async () => {
    const canada = await areas.addCountry('ca')
    const squamish = await areas.addArea('squamish', canada.metadata.area_id)

    expect(squamish?._id).toBeTruthy()

    if (squamish != null) {
      const areaUuid = squamish.metadata.area_id
      await areas.setDestinationFlag(areaUuid, true)
      await areas.setDestinationFlag(areaUuid, false)

      // eslint-disable-next-line
      await new Promise(res => setTimeout(res, 3000))

      const history = await areaHistory.getChangesByUuid(areaUuid)

      expect(history).toHaveLength(3)
      expect(history[0].change.fullDocument.metadata.isDestination).toStrictEqual(false)
      expect(history[1].change.fullDocument.metadata.isDestination).toStrictEqual(true)
      expect(history[2].change.fullDocument.metadata.isDestination).toStrictEqual(false)
    }
  })

  it('should record an Areas.deleteArea() call', async () => {
    const greece = await areas.addCountry('gr')
    const leonidio = await areas.addArea('Leonidio', greece.metadata.area_id)

    if (leonidio == null) fail()

    await areas.deleteArea(leonidio.metadata.area_id)

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 3000))

    const history = await areaHistory.getChangesByUuid(leonidio.metadata.area_id)

    expect(history).toHaveLength(2)
    expect(history[0].actionType).toEqual('insert')
    expect(history[0].change.fullDocument.area_name).toEqual(leonidio.area_name)
    expect(history[1].actionType).toEqual('delete')
    expect(history[1].change.fullDocument.area_name).toEqual(leonidio.area_name)
  })

  it('should not record a failed Areas.deleteArea() call', async () => {
    const spain = await areas.addCountry('es')
    const margalef = await areas.addArea('margalef', spain.metadata.area_id)

    if (margalef == null) fail()

    let deleted = false
    try {
      await areas.deleteArea(spain.metadata.area_id)
      fail('Shouldn\'t allow deletion when the area still has subareas')
    } catch (e) {
      deleted = true
    }

    expect(deleted).toBeTruthy()

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 3000))

    const history = await areaHistory.getChangesByUuid(spain.metadata.area_id)

    // should only have 2 entries:
    // 1. Add country
    // 2. Add child to country
    expect(history).toHaveLength(2)
  })
})
