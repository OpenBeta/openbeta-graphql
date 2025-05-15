import { getAreaModel, createIndexes } from "../../db"
import inMemoryDB from "../../utils/inMemoryDB"
import MutableAreaDataSource from "../MutableAreaDataSource"
import muid, { MUUID } from 'uuid-mongodb'
import { AreaType  } from "../../db/AreaTypes"
import AreaDataSource from "../AreaDataSource"
import MutableMediaDataSource from "../MutableMediaDataSource"
import { MediaObjectGQLInput } from "../../db/MediaObjectTypes"
import MutableClimbDataSource from "../MutableClimbDataSource"
import muuid from 'uuid-mongodb'


function mediaInput(val: number) {
    return {
  userUuid: 'a2eb6353-65d1-445f-912c-53c6301404bd',
  mediaUrl: `/u/a2eb6353-65d1-445f-912c-53c6301404bd/photo${val}.jpg`,
  width: 800,
  height: 600,
  format: 'jpeg',
  size: 45000 + Math.floor(Math.random() * 100)
} satisfies MediaObjectGQLInput}

describe("Test area data source", () => {
    let areas: AreaDataSource
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

        return MutableAreaDataSource.getInstance().addArea(
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
        rootCountry = await MutableAreaDataSource.getInstance().addCountry("USA")
      })

    afterAll(inMemoryDB.close)

    describe("Image size summing", () => {
        test("Area image size summing should not produce false counts", async () => {
            const area = await addArea()
            const val = await areas.computeImageByteSum(area.metadata.area_id)
            expect(val).toBe(0)
        })

        test("Area image size summing should work for direct tags", async () => {
            const area = await addArea()
            const media = MutableMediaDataSource.getInstance()
            const [object] = await media.addMediaObjects([mediaInput(0)])
            media.upsertEntityTag({ entityType: 1, entityUuid: area.metadata.area_id, mediaId: object._id })
            const val = await areas.computeImageByteSum(area.metadata.area_id)
            expect(val).toBe(object.size)
        })

        test("Area image size summing should work for direct tags to children", async () => {
            const media = MutableMediaDataSource.getInstance()
            const area = await addArea()
            let child = area
            let sizeAccumulator = 0
            for (const idx of Array.from({ length: 10}).map((_, idx) => idx)) {
                child = await addArea(undefined, { parent: child.metadata.area_id})
                const [object] = await media.addMediaObjects([mediaInput((idx + 1) * 10)])
                media.upsertEntityTag({ entityType: 1, entityUuid: child.metadata.area_id, mediaId: object._id })

                // We always query the top level
                expect(await areas.computeImageByteSum(area.metadata.area_id).then(d => {
                    sizeAccumulator += d
                    return sizeAccumulator
                })).toBe(sizeAccumulator)
                // equally, we expect the child to not get reverse-polluted
                expect(await areas.computeImageByteSum(child.metadata.area_id)).toBe(object.size)
            }
        })

        test("Area image size summing should work for direct tags to climbs", async () => {
            const area = await addArea()
            const media = MutableMediaDataSource.getInstance()
            const climbs = MutableClimbDataSource.getInstance()
            const child = await addArea(undefined, { parent: area.metadata.area_id})
            expect(await areas.computeImageByteSum(area.metadata.area_id)).toBe(0)
            expect(await areas.computeImageByteSum(child.metadata.area_id)).toBe(0)

            const [object] = await media.addMediaObjects([mediaInput(2 * 100)])
            const [climb] = await climbs.addOrUpdateClimbs(object.userUuid, child.metadata.area_id, [{
                name: "climb",
                grade: "6c+"
            }])

            media.upsertEntityTag({ entityType: 0, entityUuid: muuid.from(climb), mediaId: object._id })
            expect(await areas.computeImageByteSum(area.metadata.area_id)).toBe(object.size)
        })
    })
})