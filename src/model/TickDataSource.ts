import { MongoDataSource } from 'apollo-datasource-mongodb'
import { TickEditFilterType, TickType } from '../db/TickTypes'
import { getTickModel } from '../db/index.js'

export default class TickDataSource extends MongoDataSource<TickType> {
    tickModel = getTickModel()

    /**
     * @param tick 
     * takes in a new tick
     * @returns 
     * returns that new tick
     */
    async addTick(tick: TickType): Promise<any> {
        const res: TickType = await this.tickModel.create({ ...tick })
        return res
    }

    /**
     * @param _id 
     * takes in the mongodb _id value of the tick
     * and deletes that tick
     */
    async deleteTick(_id: string): Promise<any> {
        await this.tickModel.deleteOne({ _id })
    }

    /**
     * @param filter 
     * the mongodb _id value of the tick
     * @param updatedTick 
     * the changes to be made to the tick
     * @returns 
     * the new/updated tick
     */
    async editTick(filter: TickEditFilterType, updatedTick: TickType): Promise<any> {
        if (filter !== undefined) {
            const res: TickType | null = await this.tickModel.findOneAndUpdate(filter, updatedTick, { new: true })
            return res
        }
    }

    /**
     * @param ticks 
     * takes in an array of ticks, with the Mountain project id already hashed to the open-tacos id
     * @returns 
     * an array of ticks, just created in the database
     */
    async importTicks(ticks: TickType[]): Promise<any> {
        const res: TickType[] = await this.tickModel.insertMany(ticks)
        return res
    }
}