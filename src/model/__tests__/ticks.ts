import mongoose from 'mongoose'

import TickDataSource from '../TickDataSource.js'
import { connectDB, getTickModel } from '../../db/index.js'
import { TickType } from '../../db/TickTypes.js'



const toTest: TickType = {
    name: 'Small Dog',
    notes: 'Sandbagged',
    climbId: 'c76d2083-6b8f-524a-8fb8-76e1dc79833f',
    userId: 'abc123',
    style: 'Lead',
    attemptType: 'Onsight',
    dateClimbed: '12/12/12',
    grade: '5.7'
}

const toTest2: TickType = {
    name: 'Sloppy Peaches',
    notes: 'v sloppy',
    climbId: 'b767d949-0daf-5af3-b1f1-626de8c84b2a',
    userId: 'abc123',
    style: 'Lead',
    attemptType: 'Flash',
    dateClimbed: '12/10/15',
    grade: '5.10'
}

const tickUpdate: TickType = {
    name: 'Small Dog',
    notes: 'Not sandbagged',
    climbId: 'c76d2083-6b8f-524a-8fb8-76e1dc79833f',
    userId: 'abc123',
    style: 'Lead',
    attemptType: 'Fell/Hung',
    dateClimbed: '12/12/12',
    grade: '5.7'
}

const testImport: TickType[] = [
    toTest, toTest2, tickUpdate
]

describe('Ticks', () => {
    let ticks: TickDataSource
    const tickModel = getTickModel()

    beforeAll(async () => {
        console.log('#BeforeAll Ticks')
        await connectDB()

        try {
            await getTickModel().collection.drop()
        } catch (e) {
            console.log('Cleaning db')
        }

        ticks = new TickDataSource(mongoose.connection.db.collection('ticks'))
    })

    afterAll(async () => {
        await getTickModel().collection.drop()
        await mongoose.connection.close()
    })

    // test adding tick
    it('should create a new tick for the associated climb', async () => {
        const tick = await ticks.addTick(toTest)
        const newTick = await tickModel.findOne({ userId: toTest.userId })
        expect(newTick?._id).toEqual(tick._id)
    })

    // test updating tick
    it('should update a tick and return the proper information', async () => {
        const tick = await ticks.addTick(toTest)

        if (tick == null) {
            fail('Tick should not be null')
        }
        const newTick = await ticks.editTick({ _id: tick._id }, tickUpdate)

        if (newTick == null) {
            fail('The new tick should not be null')
        }
        expect(newTick?._id).toEqual(tick._id)
        expect(newTick?.notes).toEqual(tickUpdate.notes)
        expect(newTick?.attemptType).toEqual(tickUpdate.attemptType)
    })

    // test removing tick
    it('should remove a tick', async () => {
        const tick = await ticks.addTick(toTest)

        if (tick == null) {
            fail('Tick should not be null')
        }
        await ticks.deleteTick(tick._id)

        const newTick = await tickModel.findOne({ _id: tick._id })

        expect(newTick).toBeNull()
    })

    // test importing ticks
    it('should add an array of ticks', async () => {
        const newTicks = await ticks.importTicks(testImport)

        if (newTicks == null) {
            fail('Should add three new ticks')
        }

        const tick1 = await tickModel.findOne({ _id: newTicks[0]._id })
        expect(tick1?._id).toEqual(newTicks[0]._id)

        const tick2 = await tickModel.findOne({ _id: newTicks[1]._id })
        expect(tick2?._id).toEqual(newTicks[1]._id)

        const tick3 = await tickModel.findOne({ _id: newTicks[2]._id })
        expect(tick3?._id).toEqual(newTicks[2]._id)

    })
})
