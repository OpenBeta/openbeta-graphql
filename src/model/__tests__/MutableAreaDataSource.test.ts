import { GraphQLError } from "graphql"
import { getAreaModel, createIndexes } from "../../db"
import inMemoryDB from "../../utils/inMemoryDB"
import MutableAreaDataSource from "../MutableAreaDataSource"
import muid, { MUUID } from 'uuid-mongodb'
import { AreaType, OperationType } from "../../db/AreaTypes"
import { ChangeRecordMetadataType } from "../../db/ChangeLogType"
import { muuidToString, useOrCreateTransaction } from "../../utils/helpers"
import { AreaStructureError } from "../AreaRelationsEmbeddings"


describe("Test area mutations", () => {
    let areas: MutableAreaDataSource
    let rootCountry: AreaType
    let areaCounter = 0
    const testUser = muid.v4()

    async function addArea(name?: string, extra?: Partial<{ leaf: boolean, boulder: boolean, parent: MUUID | AreaType}>) {
        function isArea(x: any): x is AreaType {
            return typeof x.metadata?.area_id !== 'undefined'
        }

        areaCounter += 1
        if (name === undefined || name === 'test') {
            name = process.uptime().toString() + '-' + areaCounter.toString()
        }

        let parent: MUUID | undefined = undefined
        if (extra?.parent) {
            if (isArea(extra.parent)) {
                parent = extra.parent.metadata?.area_id
            } else {
                parent = extra.parent
            }
        }

        return areas.addArea(
            testUser,
            name,
            parent ?? rootCountry.metadata.area_id,
            undefined,
            undefined,
            extra?.leaf,
            extra?.boulder
        )
    }

    beforeAll(async () => {
        await inMemoryDB.connect()
        await getAreaModel().collection.drop()
        await createIndexes()

        areas = MutableAreaDataSource.getInstance()
        // We need a root country, and it is beyond the scope of these tests
        rootCountry =  await areas.addCountry("USA")
      })

    afterAll(inMemoryDB.close)

    describe("Add area param cases", () => {
        test("Add a simple area with no specifications using a parent UUID", () => areas
            .addArea(testUser, 'Texas2', rootCountry.metadata.area_id)
            .then(area => {
                expect(area).toMatchObject({
                    parent: rootCountry._id,
                })
                expect(area?._change).toMatchObject({
                    user: testUser,
                    operation: OperationType.addArea,
                } satisfies Partial<ChangeRecordMetadataType>)
            }))

        test("Add an area with an unknown UUID parent should fail",
                async () => await expect(() => areas.addArea(testUser, 'Texas', muid.v4())).rejects.toThrow())

        test("Add a simple area with no specifications using a country code", () => areas.addArea(testUser, 'Texas part 2', null, 'USA')
        .then(texas => {
            expect(texas).toMatchObject({
                parent: rootCountry._id,
            })
            return texas
        })
            .then(texas => areas.addArea(testUser, 'Texas Child', texas.metadata.area_id)))

        test("Add a simple area, then specify a new child one level deep", () => addArea('California')
            .then(async parent => {
                let child = await addArea('Child', { parent })
                expect(child).toMatchObject({ area_name: 'Child' })
                let parentCheck = await areas.findOneAreaByUUID(parent.metadata.area_id)
                expect(parentCheck?.embeddedRelations.children ?? []).toContainEqual(child._id)
            }))

        test("Add a leaf area", () => addArea('Somewhere').then(parent => addArea('Child', { leaf: true, parent }))
            .then(async leaf => {
                expect(leaf).toMatchObject({ metadata: { leaf: true }})
                let area = await areas.areaModel.findById(leaf._id)
                expect(area).toMatchObject({ metadata: { leaf: true }})
            }))

        test("Add a leaf area that is a boulder", () => addArea('Maine')
            .then(parent => addArea('Child', {leaf: true, boulder: true, parent} ))
            .then(area => {
                expect(area).toMatchObject({
                    metadata: {
                        leaf: true,
                        isBoulder: true,
                    },
                } satisfies Partial<Omit<AreaType, 'metadata'> & { metadata: Partial<AreaType['metadata']>}>)
            }))

        test("Add a NON-leaf area that is a boulder", () => addArea('Wisconcin')
            .then(texas => addArea('Child', { leaf: false, boulder: true }))
            .then(area => {
                expect(area).toMatchObject({
                    metadata: {
                        // Even though we specified false to leaf on the input, we expect it to be true
                        // after write because a boulder cannot contain sub-areas
                        leaf: true,
                        isBoulder: true,
                    },
                } satisfies Partial<Omit<AreaType, 'metadata'> & { metadata: Partial<AreaType['metadata']>}>)
            }))

        test("Adding a child to a leaf area should cause it to become a normal area", () => addArea()
            .then(parent => Promise.all(Array.from({ length: 5 }).map(() => addArea('test', { leaf: true, parent } ))))
            .then(([leaf]) => leaf)
            .then(leaf => addArea('test', { parent: leaf }))
            .then(leaf => expect(leaf).toMatchObject({ metadata: { leaf: false }})))

        test("area names should be unique in their parent context", () => addArea('test').then(async parent => {
            await addArea('Big ol boulder', { parent })
            await expect(() => addArea('Big ol boulder', { parent })).rejects.toThrow(AreaStructureError)
        }))
      })

      test("Delete Area", () => addArea("test").then(area => areas.deleteArea(testUser, area.metadata.area_id)).then(async deleted => {
        expect(deleted).toBeDefined()
        // TODO: this test fails based on the data returned, which appears to omit the _deleting field.
        let d = await areas.areaModel.findById(deleted?._id)

        expect(d).toBeDefined()
        expect(d).not.toBeNull()
        expect(d?._deleting).toBeDefined()
      }))

      test("Delete Area that is already deleted should throw", () => addArea("test")
        .then(area => areas.deleteArea(testUser, area.metadata.area_id))
        .then(async area => {
            expect(area).not.toBeNull()
            await expect(() => areas.deleteArea(testUser, area!.metadata.area_id)).rejects.toThrow()
        }))



      describe("Area update cases", () => {
        test("Updating an area should superficially pass", () => addArea('test').then(area => areas.updateArea(testUser, area.metadata.area_id, { areaName: `New Name! ${process.uptime()}`})))
        test("Updating an area should produce a change entry in the changelog", () => addArea('test')
            .then(area => areas.updateArea(testUser, area.metadata.area_id, { areaName: process.uptime().toString() }))
            .then(area => {
                expect(area?._change).toMatchObject({
                    user: testUser,
                    operation: OperationType.updateArea,
                } satisfies Partial<ChangeRecordMetadataType>)
            }))

        test("Area name uniqueness in its current parent context", () => addArea('test').then(async parent => {
            let [area, newArea, divorcedArea] = await Promise.all([
                addArea('original', { parent }),
                addArea('wannabe', { parent }),
                addArea(undefined, { parent: rootCountry }),
            ])

            await Promise.all([
                // Case where an area gets changed to what it already is, which should not throw an error
                areas.updateArea(testUser, area.metadata.area_id, { areaName: area.area_name }),
                // name-uniqueness should not be global, so this shouldn't throw
                areas.updateArea(testUser, divorcedArea.metadata.area_id, { areaName: area.area_name }),
                // if we update one of the areas to have a name for which another area already exists, we should expect this to throw.
                expect(() => areas.updateArea(testUser, newArea.metadata.area_id, { areaName: area.area_name })).rejects.toThrow(AreaStructureError),
            ])
        }))
      })

      test("Area name uniqueness should not create a UUID shadow via deletion", () => addArea('test').then(async parent => {
        let name = 'Big ol boulder'
        let big = await addArea(name, { boulder: true, parent })
        await areas.deleteArea(testUser, big.metadata.area_id)
        await addArea(name, { boulder: true, parent })
    }))

    test("Area name uniqueness should not create a UUID shadow via edit of name", () => addArea('test').then(async parent => {
        let nameShadow = 'Big ol boulder 2'
        let big = await addArea(nameShadow, { boulder: true, parent })

        // We change the name of the original owner of the nameshadow, and then try to add a
        // name claming the original name in this area structure context
        await areas.updateArea(testUser, big.metadata.area_id, { areaName: "Still big ol bolder"})
        await addArea(nameShadow, { boulder: true, parent })
    }))

    describe("cases for changing an areas parent",() => {
            test('Can update an areas parent reference', async () => addArea()
                .then(parent => addArea(undefined, { parent }))
                .then(async area => {
                    let otherArea = await addArea()
                    await areas.setAreaParent(testUser, area.metadata.area_id, otherArea.metadata.area_id)
                    expect(area.parent).toBeDefined()
                    expect(area.parent!.equals(otherArea._id))
                }))

            test('Updating an area will not produce duplicate named children in the target', async () => addArea()
                .then(async parent => addArea(undefined, { parent }))
                .then(async area => {
                    let otherArea = await addArea()
                    // put a duplicate name inside otherArea
                    addArea(area.area_name, { parent: otherArea })

                    await expect(
                        () => areas.setAreaParent(testUser, area.metadata.area_id, otherArea.metadata.area_id)
                    ).rejects.toThrow(AreaStructureError)
                }))

            test('Updating an areas parents reference to the one already specified should throw', async () => addArea()
                .then(async parent => [ await addArea(undefined, { parent }), parent])
                .then(async ([area, parent]) => {
                    expect(area.parent?.equals(parent._id))
                    await expect(
                        () => areas
                        .setAreaParent(testUser, area.metadata.area_id, parent.metadata.area_id)
                    )
                        .rejects
                        .toThrow(AreaStructureError)
                }))

            test('Updating an areas parents reference adds an area to its new parents children', async () => addArea(undefined)
                .then(async area => {
                    let other = await addArea(undefined)
                    expect(other.embeddedRelations.children).toHaveLength(0)
                    await areas.setAreaParent(testUser, area.metadata.area_id, other.metadata.area_id)
                    other = await areas.areaModel.findById(other._id).orFail()
                    expect(other.embeddedRelations.children).toHaveLength(1)
                    expect(other.embeddedRelations.children.some(child => child.equals(area._id)))
                }))

            test('test the unit of code that pulls children from the embedded array when there is no parent field to back it.', async () => addArea(undefined)
                .then(async parent => {
                    let child = await addArea(undefined, { parent })
                    let otherParent = await addArea(undefined)

                    parent = await areas.areaModel.findById(child.parent).orFail()

                    // We expect the parent to now have a child-reference to the area that points back to its parent
                    expect(child.parent?.equals(parent._id))
                    expect(parent.embeddedRelations.children.some(child => child.equals(child._id))).toBeTruthy()

                    // Manually change the parent reference
                    // This should produce no effects and as a result our
                    // await areas.areaModel.updateOne({ _id: child._id }, { parent: otherParent._id })
                    child.parent = otherParent._id

                    await useOrCreateTransaction(areas.areaModel, undefined, async (session) => {
                      await areas.relations.deleteStaleReferences(child, session)
                    })

                    parent = await areas.areaModel.findById(parent._id).orFail()
                    expect(parent.embeddedRelations.children.some(child => child.equals(child._id))).not.toBeTruthy()
                }))

            test('Updating an areas parents reference REMOVED an area from its old parents children', async () => addArea(undefined)
                .then(async area => {
                    await addArea(undefined)
                    let other = await addArea(undefined)
                    let original = await areas.areaModel.findById(area.parent).orFail()

                    // We expect the original area to have a relation present to this node
                    expect(original.embeddedRelations.children.some(child => child.equals(area._id))).toBeTruthy()

                    await areas.setAreaParent(testUser, area.metadata.area_id, other.metadata.area_id)
                    original = await areas.areaModel.findById(area.parent).orFail()

                    // Now we expect that embedding to have updated
                    expect(original.embeddedRelations.children.some(child => child.equals(area._id))).not.toBeTruthy()
                }))

            test('Updating an areas parent reference should produce an appropriate changelog item', async () => {
                let area = await addArea()
                let parent = await addArea()

                await areas.setAreaParent(testUser, area.metadata.area_id, parent.metadata.area_id)

                area = await areas.findOneAreaByUUID(area.metadata.area_id)
                expect(area._change).toBeDefined()
                expect(area._change!.operation).toEqual(OperationType.changeAreaParent)
            })
            test('Updating an areas parent reference should update an areas embeddedRelations', async () => {
                let railLength = 7
                let rail: AreaType[] = [rootCountry]
                let newParent = await addArea()

                for (const idx in Array.from({ length: railLength }).map((_, idx) => idx)) {
                    rail.push(await addArea(undefined, { parent: rail[idx] }))
                }

                expect(rail).toHaveLength(railLength + 1)

                await areas.setAreaParent(testUser, rail[1].metadata.area_id, newParent.metadata.area_id)
                let area = await areas.findOneAreaByUUID(rail[1].metadata.area_id)
                expect(area.embeddedRelations.ancestors[2]._id.equals(newParent._id))
            })

            test('Modifying an areas parent should update its child embeddedRelations', async () => {
                let railLength = 7
                let rail: AreaType[] = [rootCountry]

                for (const idx in Array.from({ length: railLength }).map((_, idx) => idx)) {
                    rail.push(await addArea(undefined, { parent: rail[idx] }))
                }

                expect(rail).toHaveLength(railLength + 1)

                const offset = 1
                let newParent = await addArea()
                await areas.setAreaParent(testUser, rail[offset].metadata.area_id, newParent.metadata.area_id)

                for (const oldAreaData of rail.slice(1 + offset)) {
                    // get the most up-to-date copy of this area
                    const area = await areas.areaModel.findById(oldAreaData._id).orFail()
                    // This expects a valid chain of IDs for each ancestor - the second-last ancestor is our parent
                    expect(area.embeddedRelations.ancestors.at(-2)!._id.equals(area.parent!)).toEqual(true)

                    const pathElement = area.embeddedRelations.ancestors[offset]
                    // we expect the element at [offset] to have changed such that the new objectID is not equal to its previous value
                    expect(pathElement._id.equals(oldAreaData.embeddedRelations.ancestors[offset]._id)).toEqual(false)
                    // This will validate that the element at [offset] has been set to our target newParent
                    expect(pathElement._id.equals(newParent._id))

                    // If the above expectations are met but these following ones are not, then the ID was correctly migrated but the
                    // name and UUID were not? This is a strange case indeed.
                    expect(muuidToString(pathElement.uuid)).toEqual(muuidToString(newParent.metadata.area_id))

                    expect(pathElement.name).not.toEqual(oldAreaData.embeddedRelations.ancestors[offset].name)
                    expect(pathElement.name).toEqual(newParent.area_name)
                }
            })

            test('Attempting to update a countries parent should throw', async () => {
                let other = await areas.addCountry('CA')
                expect(() => areas.setAreaParent(testUser, rootCountry.metadata.area_id, other.metadata.area_id)).rejects.toThrowError(AreaStructureError)
            })

            test('Circular references should always be prohibitted', async () => {
                let parent = await addArea()
                let child = await addArea(undefined, { parent })
                let child2 = await addArea(undefined, { parent: child })
                
                expect(() => areas.setAreaParent(testUser, parent.metadata.area_id, child.metadata.area_id )).rejects.toThrowError(AreaStructureError)
                expect(() => areas.setAreaParent(testUser, parent.metadata.area_id, child2.metadata.area_id )).rejects.toThrowError(AreaStructureError)
                expect(() => areas.setAreaParent(testUser, child.metadata.area_id, child2.metadata.area_id )).rejects.toThrowError(AreaStructureError)
            })

            test('Self-referece should always be prohobitted', async () => addArea().then(area => {
                expect(() => areas.setAreaParent(testUser, area.metadata.area_id, area.metadata.area_id)).rejects.toThrowError(AreaStructureError)
                expect(() => areas.setAreaParent(testUser, area.metadata.area_id, area.metadata.area_id)).rejects.toThrowError('You cannot set self as a parent')
            }))
    })
})