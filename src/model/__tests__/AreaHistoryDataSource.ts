import mongoose from 'mongoose'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getAreaHistoryModel } from '../../db/index.js'
import streamListener from '../../db/edit/streamListener'
import AreaHistoryDataSource from '../AreaHistoryDatasource.js'

describe('Area history', () => {
  let areas: MutableAreaDataSource
  let areaHistory: AreaHistoryDataSource
  let stream
  beforeAll(async () => {
    console.log('#beforeAll AreaHistory')
    await connectDB()

    try {
      await getAreaModel().collection.drop()
      await getAreaHistoryModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test')
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

  it('should record Areas.setDestination() calls ', async () => {
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
})
