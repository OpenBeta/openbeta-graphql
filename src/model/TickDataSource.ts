import { MongoDataSource } from 'apollo-datasource-mongodb'
import { TickType } from '../db/TickTypes'
import { getTickModel } from '../db/TickSchema'

export default class TickDataSource extends MongoDataSource<TickType> {
    tickModel = getTickModel()

    async addTick(tick: TickType): Promise<any> {
        this.tickModel.create(tick)
    }

    //remove tick

    //edit tick

    //import ticks

}