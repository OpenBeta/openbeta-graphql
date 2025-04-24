import { GraphQLError } from 'graphql'
import muid from 'uuid-mongodb'
import { AreaType, OperationType } from '../../db/AreaTypes'
import { ChangeRecordMetadataType } from '../../db/ChangeLogType'
import { dataFixtures as test } from '../../__tests__/fixtures/data.fixtures'
import { ok } from 'assert'

describe('Test area mutations', () => {
  describe('Add area param cases', () => {
    test('Add a simple area with no specifications using a parent UUID', async ({ areas, user, country }) => await areas
      .addArea(user, 'Texas2', country.metadata.area_id)
      .then(area => {
        expect(area?._change).toMatchObject({
          user,
          operation: OperationType.addArea
        } satisfies Partial<ChangeRecordMetadataType>)
      }))

    test('Add an area with an unknown UUID parent should fail',
      async ({ areas, user, country }) => await expect(async () => await areas.addArea(user, 'Texas', muid.v4())).rejects.toThrow())

    test('Add a simple area with no specifications using a country code', async ({ areas, user, country }) => await areas.addArea(user, 'Texas part 2', null, country.shortCode)
      .then(async texas => await areas.addArea(user, 'Texas Child', texas.metadata.area_id)))

    test('Add a simple area, then specify a new child one level deep', async ({ areas, addArea }) => await addArea('California')
      .then(async parent => {
        const child = await addArea('Child', { parent })
        expect(child).toMatchObject({ area_name: 'Child' })
        const parentCheck = await areas.findOneAreaByUUID(parent.metadata.area_id)
        expect(parentCheck?.children ?? []).toContainEqual(child._id)
      }))

    test('Add a leaf area', async ({ areas, addArea }) => await addArea('Somewhere').then(async parent => await addArea('Child', { leaf: true, parent }))
      .then(async leaf => {
        expect(leaf).toMatchObject({ metadata: { leaf: true } })
        const area = await areas.areaModel.findById(leaf._id)
        expect(area).toMatchObject({ metadata: { leaf: true } })
      }))

    test('Add a leaf area that is a boulder', async ({ addArea }) => await addArea('Maine')
      .then(async parent => await addArea('Child', { leaf: true, boulder: true, parent }))
      .then(area => {
        expect(area).toMatchObject({
          metadata: {
            leaf: true,
            isBoulder: true
          }
        } satisfies Partial<Omit<AreaType, 'metadata'> & { metadata: Partial<AreaType['metadata']> }>)
      }))

    test('Add a NON-leaf area that is a boulder', async ({ addArea }) => await addArea('Wisconcin')
      .then(async texas => await addArea('Child', { leaf: false, boulder: true }))
      .then(area => {
        expect(area).toMatchObject({
          metadata: {
            // Even though we specified false to leaf on the input, we expect it to be true
            // after write because a boulder cannot contain sub-areas
            leaf: true,
            isBoulder: true
          }
        } satisfies Partial<Omit<AreaType, 'metadata'> & { metadata: Partial<AreaType['metadata']> }>)
      }))

    test('Adding a child to a leaf area should cause it to become a normal area', async ({ addArea }) => await addArea()
      .then(async parent => await Promise.all(new Array(5).map(async () => await addArea('test', { leaf: true, parent }))))
      .then(([leaf]) => leaf)
      .then(async leaf => await addArea('test', { parent: leaf }))
      .then(leaf => expect(leaf).toMatchObject({ metadata: { leaf: false } })))

    test('area names should be unique in their parent context', async ({ areas, user, country, addArea }) => await addArea('test').then(async parent => {
      await addArea('Big ol boulder', { parent })
      await expect(async () => await addArea('Big ol boulder', { parent })).rejects.toThrow(GraphQLError)
    }))
  })

  test('Delete Area', async ({ areas, user, addArea }) => await addArea('test').then(async area => await areas.deleteArea(user, area.metadata.area_id)).then(async deleted => {
    expect(deleted).toBeDefined()
    // TODO: this test fails based on the data returned, which appears to omit the _deleting field.
    const d = await areas.areaModel.findById(deleted?._id)

    expect(d).toBeDefined()
    expect(d).not.toBeNull()
    expect(d?._deleting).toBeDefined()
  }))

  test('Delete Area that is already deleted should throw', async ({ areas, user, addArea }) => await addArea('test')
    .then(async area => await areas.deleteArea(user, area.metadata.area_id))
    .then(async area => {
      expect(area).not.toBeNull()
      ok(area !== null)
      await expect(async () => await areas.deleteArea(user, area.metadata.area_id)).rejects.toThrow()
    }))

  describe('Area update cases', () => {
    test('Updating an area should superficially pass', async ({ areas, user, addArea }) => await addArea('test').then(async area => await areas.updateArea(user, area.metadata.area_id, { areaName: `New Name! ${process.uptime()}` })))
    test('Updating an area should produce a change entry in the changelog', async ({ areas, user, country, addArea }) => await addArea('test')
      .then(async area => await areas.updateArea(user, area.metadata.area_id, { areaName: process.uptime().toString() }))
      .then(area => {
        expect(area?._change).toMatchObject({
          user,
          operation: OperationType.updateArea
        } satisfies Partial<ChangeRecordMetadataType>)
      }))

    test('Area name uniqueness in its current parent context', async ({ areas, user, addArea }) => await addArea('test').then(async parent => {
      const [area, newArea, divorcedArea] = await Promise.all([
        addArea('original', { parent }),
        addArea('wannabe', { parent }),
        addArea()
      ])

      await Promise.all([
        // Case where an area gets changed to what it already is, which should not throw an error
        areas.updateArea(user, area.metadata.area_id, { areaName: area.area_name }),
        // name-uniqueness should not be global, so this shouldn't throw
        areas.updateArea(user, divorcedArea.metadata.area_id, { areaName: area.area_name }),
        // if we update one of the areas to have a name for which another area already exists, we should expect this to throw.
        expect(async () => await areas.updateArea(user, newArea.metadata.area_id, { areaName: area.area_name })).rejects.toThrow(GraphQLError)
      ])
    }))
  })

  test('Area name uniqueness should not create a UUID shadow via deletion', async ({ areas, user, country, addArea }) => await addArea('test').then(async parent => {
    const name = 'Big ol boulder'
    const big = await addArea(name, { boulder: true, parent })
    await areas.deleteArea(user, big.metadata.area_id)
    await addArea(name, { boulder: true, parent })
  }))

  test('Area name uniqueness should not create a UUID shadow via edit of name', async ({ areas, user, country, addArea }) => await addArea('test').then(async parent => {
    const nameShadow = 'Big ol boulder 2'
    const big = await addArea(nameShadow, { boulder: true, parent })

    // We change the name of the original owner of the nameshadow, and then try to add a
    // name claming the original name in this area structure context
    await areas.updateArea(user, big.metadata.area_id, { areaName: 'Still big ol bolder' })
    await addArea(nameShadow, { boulder: true, parent })
  }))
})
