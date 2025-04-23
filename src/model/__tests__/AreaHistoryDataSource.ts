import muuid from 'uuid-mongodb'
import { dataFixtures as it } from '../../__tests__/fixtures/data.fixtures.js'
import { AreaType } from '../../db/AreaTypes.js'
import { BaseChangeRecordType } from '../../db/ChangeLogType.js'

describe('Area history', () => {
  it.todo('should create history changes for an area when children get added to it', async ({
    changeLog,
    area,
    addArea,
    waitForChanges
  }) => {
    const historySettled = waitForChanges({ document: area, count: 2 })
    await addArea('nevada', { parent: area })
    await addArea('oregon', { parent: area })
    await historySettled

    expect(
      await changeLog.getAreaChangeSets(area.metadata.area_id)
    ).toHaveLength(2)
  })

  it('should properly seperate unrelated histories', async ({
    changeLog,
    area,
    addArea,
    waitForChanges
  }) => {
    const mainAreaHistory = waitForChanges({ document: area, count: 2 })
    await Promise.all([
      addArea(undefined, { parent: area }),
      addArea(undefined, { parent: area })
    ])
    await mainAreaHistory

    const randomHistory = await changeLog.getAreaChangeSets(muuid.v4())
    expect(randomHistory).toHaveLength(0)
  })

  it('should return change sets in most recent order', async ({
    changeLog,
    area,
    addArea,
    areas,
    waitForChanges,
    user
  }) => {
    const mainAreaHistory = waitForChanges({ document: area, count: 2 })
    const child = await addArea(undefined, { parent: area })
    await areas.deleteArea(user, child.metadata.area_id)

    await mainAreaHistory

    const changeSets = await changeLog.getAreaChangeSets(area.metadata.area_id)

    // verify changes in most recent order
    assert(area._change?.historyId)
    assert(changeSets[1].changes[0].fullDocument._change?.historyId)
    expect(
      changeSets[0].changes[0].fullDocument._change?.prevHistoryId?.equals(
        changeSets[1].changes[0].fullDocument._change?.historyId
      )
    )
  })

  it.todo('should create history records for new subareas', async ({
    changeLog,
    area,
    addArea,
    country,
    waitForChanges
  }) => {
    const mainAreaHistory = waitForChanges({ document: area, count: 2 })
    const nv = await addArea('nevada', { parent: area })
    await addArea('oregon', { parent: area })

    await mainAreaHistory

    const initialHistory = await changeLog.getAreaChangeSets(
      area.metadata.area_id
    )
    const nvAreaHistory: Array<BaseChangeRecordType<AreaType>> =
      initialHistory[1].changes

    // verify change history linking
    expect(
      nvAreaHistory[0].fullDocument._change?.historyId.equals(
        initialHistory[0]._id
      )
    ) // should point to current change
    expect(
      nvAreaHistory[0].fullDocument._change?.prevHistoryId
    ).not.toBeDefined() // new document -> no previous history

    expect(nvAreaHistory[1].dbOp).toEqual('update') // add area to country.children[]
    expect(nvAreaHistory[1].fullDocument.area_name).toEqual(area?.area_name)

    // coco: What? I don't see where this is supposed to happen I am confused
    expect(nvAreaHistory[1].fullDocument.children).toHaveLength(2)
    expect(nvAreaHistory[1].fullDocument.children[1]).toEqual(nv?._id) // area added to parent.children[]?

    // verify change history linking
    // 2nd change record: parent (country)
    expect(
      nvAreaHistory[1].fullDocument._change?.historyId.equals(
        initialHistory[0]._id
      )
    ) // should point to current change
    expect(
      nvAreaHistory[1].fullDocument._change?.prevHistoryId?.equals(
        initialHistory[1]._id
      )
    ) // should point to previous Add new area

    // Verify parent history
    const countryHistory2 = await changeLog.getAreaChangeSets(
      area.metadata.area_id
    )
    expect(countryHistory2).toHaveLength(2)
    expect(countryHistory2[0].operation).toEqual('addArea')
    expect(countryHistory2[1].operation).toEqual('addArea')

    // Verify USA history links
    expect(countryHistory2[0].changes[0])
  })

  it('should record multiple Areas.setDestination() calls ', async ({
    user,
    areas,
    changeLog,
    country,
    area
  }) => {
    const areaUuid = area.metadata.area_id
    await expect(
      areas.setDestinationFlag(user, muuid.v4(), true)
    ).rejects.toThrow() // non-existent area id. Trx won't be recorded

    await areas.setDestinationFlag(user, areaUuid, true)
    await areas.setDestinationFlag(user, areaUuid, false)

    await new Promise((resolve) => setTimeout(resolve, 200))
    const changset = await changeLog.getAreaChangeSets(areaUuid)

    expect(changset).toHaveLength(3)
    expect(changset[0].operation).toEqual('updateDestination')
    expect(changset[1].operation).toEqual('updateDestination')
    expect(changset[2].operation).toEqual('addArea')

    expect(
      changset[0].changes[0].fullDocument.metadata.isDestination
    ).toStrictEqual(false)
    expect(
      changset[1].changes[0].fullDocument.metadata.isDestination
    ).toStrictEqual(true)
    expect(
      changset[2].changes[0].fullDocument.metadata.isDestination
    ).toStrictEqual(false) // default
  })

  it('should record an Areas.deleteArea() call', async ({
    user,
    areas,
    changeLog,
    area,
    waitForChanges
  }) => {
    await areas.deleteArea(user, area.metadata.area_id)
    await waitForChanges({ document: area, count: 1 })

    const history = await changeLog.getAreaChangeSets(area.metadata.area_id)

    expect(history).toHaveLength(2)
    expect(history[0].operation).toEqual('deleteArea')
    expect(history[1].operation).toEqual('addArea')

    expect(history[0].changes[0].fullDocument._id).toEqual(area._id)
  })

  it('should not record a failed Areas.deleteArea() call', async ({
    user,
    area,
    areas,
    addArea,
    changeLog,
    waitForChanges
  }) => {
    const process = waitForChanges({ document: area, count: 2 })
    const child = await addArea(undefined, { parent: area })
    // by giving this child its own child, we can create a vioalation condition if someone were
    // to try and delete <child>
    await addArea(undefined, { parent: child })

    await expect(
      async () => await areas.deleteArea(user, child.metadata.area_id)
    ).rejects.toThrow()
    await process

    const history = await changeLog.getAreaChangeSets(area.metadata.area_id)

    // should only have 2 entries:
    // 1. Add child
    // 2. Add child to that child
    expect(history).toHaveLength(2)
    expect(history[0].operation).toEqual('addArea')
    expect(history[1].operation).toEqual('addArea')
  })
})
