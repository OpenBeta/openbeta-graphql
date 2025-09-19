import { MUUID } from "uuid-mongodb"
import { AreaType, DenormalizedAreaSummary } from "../../db/AreaTypes"
import MutableAreaDataSource from "../MutableAreaDataSource"
import muid from 'uuid-mongodb'
import { getAreaModel, createIndexes } from "../../db"
import inMemoryDB from "../../utils/inMemoryDB"
import { muuidToString, resolveTransaction, useOrCreateTransaction } from "../../utils/helpers"

export function embeddedRelationsReducer(path: AreaType[]) {
    let trace: DenormalizedAreaSummary[] = []
    path.forEach((area, idx) => {
        trace.push({
            uuid: area.metadata.area_id,
            _id: area._id,
            name: area.area_name
        })

        expect(area.embeddedRelations.ancestors).toMatchObject(trace)

        if (idx === 0) {
            return
        }

        area.parent?.equals(path[idx]._id)
    })
}

describe("updating of areas should propogate embeddedRelations", () => {
    let areas: MutableAreaDataSource
    let rootCountry: AreaType
    let areaCounter = 0
    const testUser = muid.v4()

    beforeAll(async () => {
        await inMemoryDB.connect()
        await getAreaModel().collection.drop()
        await createIndexes()

        areas = MutableAreaDataSource.getInstance()
        // We need a root country, and it is beyond the scope of these tests
        rootCountry =  await areas.addCountry("USA")
      })

    afterAll(inMemoryDB.close)

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

    const defaultDepth = 5
    async function growTree(depth: number = defaultDepth, bredth: number = 1): Promise<AreaType[]> {
        const tree: AreaType[] = [rootCountry, await addArea()]

        async function grow(from: AreaType, level: number = 0) {
            if (level >= depth) return

            await Promise.all(Array.from({ length: bredth })
                .map((_ ,idx) => addArea(`${level}-${idx}`, { parent: from })
                .then(area => {
                    if (!area.parent?.equals(from._id)) {
                        throw new Error(`${area.parent} should have been ${from._id}`)
                    }
                    tree.push(area)
                    return grow(area, level + 1)
                })))
        }

        await grow(tree.at(-1)!)

        return tree
    }

    test('computing ancestors from reified node', async () => growTree().then(async (tree) => {
        await useOrCreateTransaction(areas.areaModel, undefined, async (session) => {
        let computedAncestors = await areas.relations.computeAncestorsFor(tree.at(-1)!._id, session)

        // We expect the mongo computation to pull down the same data as our locally constructed tree
        // caveat: the ancestor computation does not include the leaf.
        expect(computedAncestors.length).toBe(tree.length - 1)
        expect(computedAncestors).not.toContainEqual(tree.at(-1))
        expect(computedAncestors.map(i => i.ancestor._id).join(",")).toEqual(tree.slice(0, -1).map(i => i._id).join(","))
        expect(computedAncestors.map(i => i.ancestor.area_name).join()).toEqual(tree.slice(0, -1).map(i => i.area_name).join())


        // Check that each node refers specifically to the previous one as its parent
        // - this will check that the areas are in order and that no nodes are skipped.
        computedAncestors.reduce((previous, current, idx) => {
            expect(current.ancestor.parent?.equals(previous.ancestor._id))
            expect(current.ancestor._id.equals(tree[idx]._id))
            return current
        })
    })

    }))

    test('ancestors should be computed on area add.', async () => growTree(5).then(async (tree) => {
        let leaf = tree.at(-1)!
        expect(leaf.embeddedRelations.ancestors.map(i => i.name).join(',')).toEqual(tree.map(i => i.area_name).join(','))
        expect(leaf.embeddedRelations.ancestors.map(i => muuidToString(i.uuid)).join(',')).toEqual(tree.map(i => i.metadata.area_id).join(','))
        expect(leaf.embeddedRelations.ancestors.map(i => i._id).join(',')).toEqual(tree.map(i => i._id).join(','))
    }))

    test("creating an area should update its immediate parent's children", async () => growTree(3).then(async (tree) => {
        // add a new child to leaf
        let leaf = await addArea(undefined, { parent: tree.at(-1)! })
        let parent = await areas.findOneAreaByUUID(tree.at(-1)!.metadata.area_id)
        expect(parent.embeddedRelations.children).toContainEqual(leaf._id)
    }))

    test("re-naming an area should update its pathTokens", async () => growTree(5).then(async tree => {
        await useOrCreateTransaction(areas.areaModel, undefined, async (session) => {
            let treeLength = tree.length
            let target = Math.floor(treeLength / 2)

            await areas.updateArea(
                testUser,
                tree[target].metadata.area_id, {
                    areaName: 'updated name'
                },
            )

            tree = (await areas.relations.computeAncestorsFor(tree.at(-1)!._id, session)).map( i => i.ancestor)

            expect(tree[target].area_name).toEqual('updated name')
            expect(tree[target].embeddedRelations.ancestors.map(i => i.name)[target]).toEqual('updated name')
        })
    }))

    test("re-naming a parent should update all descendant pathTokens", async () => growTree(5, 2).then(async tree => {
        let target = 1
        let oldName =  tree[target].area_name
        await areas.updateArea(
            testUser,
            tree[target].metadata.area_id, {
                areaName: 'updated name'
            },
        )

        // Check every node in the tree, with nodes of a certain depth needing to have their pathtokens checked.
        for (const node of tree.filter(i => i.embeddedRelations.ancestors.length > target)) {
            let area = await areas.findOneAreaByUUID(node.metadata.area_id)
            expect(area.embeddedRelations.ancestors.map(i => i.name)[target]).not.toEqual(oldName)
            expect(area.embeddedRelations.ancestors.map(i => i.name)[target]).toEqual('updated name')
        }
    }))


    test.todo("syncEmbeddedRelations")
})
