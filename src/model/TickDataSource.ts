import { MongoDataSource } from 'apollo-datasource-mongodb'
import { TickType } from '../db/TickTypes'
import { getTickModel } from '../db/index.js'

export default class TickDataSource extends MongoDataSource<TickType> {
    tickModel = getTickModel()

    async addTick(tick: TickType): Promise<any> {
        const res: TickType = await this.tickModel.create({ ...tick })
        return res
    }

    //remove tick

    //edit tick

    //import ticks

}