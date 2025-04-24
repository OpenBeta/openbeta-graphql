import muuid from 'uuid-mongodb'
import { dataFixtures as it } from '../../__tests__/fixtures/data.fixtures.js'
import { AreaType, OperationType } from '../../db/AreaTypes.js'
import { BaseChangeRecordType } from '../../db/ChangeLogType.js'
import { ok } from 'assert'

describe('Area history', () => {
  it('should create history changes for an area when children get added to it', async ({
    changeLog,
    area,
    addArea,
    waitForChanges
  }) => {
    await Promise.all([
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      }),
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      })
    ])

    expect(
      await changeLog.getAreaChangeSets(area.metadata.area_id)
    ).toHaveLength(3)
  })

  it('should properly seperate unrelated histories', async ({
    changeLog,
    area,
    addArea,
    waitForChanges
  }) => {
    await Promise.all([
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      }),
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      })
    ])

    const randomHistory = await changeLog.getAreaChangeSets(muuid.v4())
    expect(randomHistory).toHaveLength(0)
  })

  it('should create history records for new subareas', async ({
    changeLog,
    area,
    addArea,
    waitForChanges,
    user
  }) => {
    await Promise.all([
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      }),
      waitForChanges({ document: area }, async () => {
        await addArea(undefined, { parent: area })
      })
    ])

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
    const parentHistory = await changeLog.getAreaChangeSets(area.metadata.area_id)
    // We expect the last two operations for the parent to be the two
    // 'add area' events
    expect(parentHistory[0].operation).toEqual('addArea')
    expect(parentHistory[1].operation).toEqual('addArea')
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

    await new Promise((resolve) => setTimeout(resolve, 300))
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
    await waitForChanges({ document: area, operation: OperationType.deleteArea }, async () => {
      await areas.deleteArea(user, area.metadata.area_id)
    })

    const history = await changeLog.getAreaChangeSets(area.metadata.area_id)

    expect(history.map(i => i.operation)).toContain(OperationType.addArea)
    expect(history.map(i => i.operation)).toContain(OperationType.deleteArea)

    const addRef = history.find(i => i.operation === OperationType.addArea)
    const deleteRef = history.find(i => i.operation === OperationType.deleteArea)

    ok(addRef !== undefined)
    ok(deleteRef !== undefined)

    expect(history.indexOf(addRef)).toBeGreaterThan(history.indexOf(deleteRef))
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
    const child = await waitForChanges({ document: area }, async () => await addArea(undefined, { parent: area }))
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
