import mongoose from 'mongoose'
import { ChangeStream } from 'mongodb'
import { jest } from '@jest/globals'
import muuid from 'uuid-mongodb'

import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel } from '../../db/index.js'
import streamListener from '../../db/edit/streamListener'
import { logger } from '../../logger.js'
import { changelogDataSource } from '../ChangeLogDataSource'
import { OperationType } from '../../db/AreaTypes'

jest.setTimeout(120000)

describe('Area history', () => {
  let areas: MutableAreaDataSource
  let stream: ChangeStream
  const testUser = muuid.v4()

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

  beforeEach(async () => {
    await changelogDataSource._testRemoveAll()
    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 3000))
  })

  it('should create history records for new country and subareas', async () => {
    const usa = await areas.addCountry(testUser, 'usa')
    await createIndexes()
    const newArea = await areas.findOneAreaByUUID(usa.metadata.area_id)
    expect(newArea.area_name).toEqual(usa.area_name)

    const or = await areas.addArea(testUser, 'oregon', usa.metadata.area_id)
    const nv = await areas.addArea(testUser, 'nevada', usa.metadata.area_id)

    expect(nv?._id).toBeTruthy()
    expect(or?._id).toBeTruthy()

    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 2000))

    const areaHistory = await changelogDataSource.getAreaChangeSets()

    expect(areaHistory).toHaveLength(3)
    // verify changes in most recent order
    expect(areaHistory[0].operation).toEqual(OperationType.addArea)
    expect(areaHistory[1].operation).toEqual(OperationType.addArea)
    expect(areaHistory[2].operation).toEqual(OperationType.addCountry)

    const newCountryChange = areaHistory[2].changes
    expect(newCountryChange).toHaveLength(1)
    expect(newCountryChange[0].dbOp).toEqual('insert')
    expect(newCountryChange[0].fullDocument.area_name).toEqual(usa.area_name)

    // Verify NV history
    const nvAreaHistory = areaHistory[0].changes
    expect(nvAreaHistory).toHaveLength(2)

    // history is shown most recent first
    expect(nvAreaHistory[0].dbOp).toEqual('insert') // insert new area
    expect(nvAreaHistory[0].fullDocument.area_name).toEqual(nv?.area_name) // area added to the right parent?

    expect(nvAreaHistory[1].dbOp).toEqual('update') // add area to country.children[]
    expect(nvAreaHistory[1].fullDocument.area_name).toEqual(usa?.area_name)

    expect(nvAreaHistory[1].fullDocument.children).toHaveLength(2)
    expect(nvAreaHistory[1].fullDocument.children[1]).toEqual(nv?._id) // area added to parent.children[]?

    // Verify OR history
    const orAreaHistory = areaHistory[1].changes
    expect(orAreaHistory).toHaveLength(2)

    const randomHistory = await changelogDataSource.getAreaChangeSets(muuid.v4())
    expect(randomHistory).toHaveLength(0)

    // Verify USA history
    const usaHistory = await changelogDataSource.getAreaChangeSets(usa.metadata.area_id)
    expect(usaHistory).toHaveLength(3)
    expect(usaHistory[0].operation).toEqual('addArea')
    expect(usaHistory[1].operation).toEqual('addArea')
    expect(usaHistory[2].operation).toEqual('addCountry')
  })

  // it('should record multiple Areas.setDestination() calls ', async () => {
  //   const canada = await areas.addCountry(testUser, 'can')
  //   const squamish = await areas.addArea(testUser, 'squamish', canada.metadata.area_id)

  //   expect(squamish?._id).toBeTruthy()

  //   if (squamish != null) {
  //     const areaUuid = squamish.metadata.area_id
  //     await areas.setDestinationFlag(testUser, muuid.v4(), true) // non-existent area id. Trx won't be recorded
  //     await areas.setDestinationFlag(testUser, areaUuid, true)
  //     await areas.setDestinationFlag(testUser, areaUuid, false)

  //     // eslint-disable-next-line
  //     await new Promise(res => setTimeout(res, 2000))

  //     const changset = await changelogDataSource.getAreaChangeSets(areaUuid)

  //     expect(changset).toHaveLength(3)
  //     expect(changset[0].operation).toEqual('updateDestination')
  //     expect(changset[1].operation).toEqual('updateDestination')
  //     expect(changset[2].operation).toEqual('addArea')

  //     expect(changset[0].changes[0].fullDocument.metadata.isDestination).toStrictEqual(false)
  //     expect(changset[1].changes[0].fullDocument.metadata.isDestination).toStrictEqual(true)
  //     expect(changset[2].changes[0].fullDocument.metadata.isDestination).toStrictEqual(false) // default
  //   }
  // })

  // it('should record an Areas.deleteArea() call', async () => {
  //   const greece = await areas.addCountry(testUser, 'gr')
  //   const leonidio = await areas.addArea(testUser, 'Leonidio', greece.metadata.area_id)

  //   if (leonidio == null) fail()

  //   await areas.deleteArea(testUser, leonidio.metadata.area_id)

  //   // eslint-disable-next-line
  //   await new Promise(res => setTimeout(res, 10000))

  //   const history = await changelogDataSource.getAreaChangeSets(leonidio.metadata.area_id)

  //   expect(history).toHaveLength(2)
  //   expect(history[0].operation).toEqual('deleteArea')
  //   expect(history[1].operation).toEqual('addArea')

  //   expect(history[0].changes[0].fullDocument._id).toEqual(leonidio._id)
  // })

  // it('should not record a failed Areas.deleteArea() call', async () => {
  //   const spain = await areas.addCountry(testUser, 'es')
  //   const margalef = await areas.addArea(testUser, 'margalef', spain.metadata.area_id)

  //   if (margalef == null) fail()

  //   let deleted = false
  //   try {
  //     await areas.deleteArea(testUser, spain.metadata.area_id)
  //     fail('Shouldn\'t allow deletion when the area still has subareas')
  //   } catch (e) {
  //     deleted = true
  //   }

  //   expect(deleted).toBeTruthy()

  //   // eslint-disable-next-line
  //   await new Promise(res => setTimeout(res, 3000))

  //   const history = await changelogDataSource.getAreaChangeSets(spain.metadata.area_id)

  //   // should only have 2 entries:
  //   // 1. Add country
  //   // 2. Add child to country
  //   expect(history).toHaveLength(2)
  //   expect(history[0].operation).toEqual('addArea')
  //   expect(history[1].operation).toEqual('addCountry')
  // })
})
