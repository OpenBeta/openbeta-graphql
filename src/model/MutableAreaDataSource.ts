import { AreaType } from '../db/AreaTypes'
import AreaDataSource from './AreaDataSource'
import { createRootNode } from '../db/import/usa/AreaTree'
import { makeDBArea } from '../db/import/usa/AreaTransformer'
import { MUUID } from 'uuid-mongodb'

export default class MutableAreaDataSource extends AreaDataSource {
  async addArea (area: AreaType): Promise<any> {
    return await this.mediaModel.insertMany([area])
  }

  async addCountry (countryCode: string): Promise<AreaType> {
    const countryNode = createRootNode(countryCode)
    const doc = makeDBArea(countryNode)
    doc.shortCode = countryCode
    const rs = await this.areaModel.insertMany(doc)
    return rs[0]
  }

  async deleteArea (uuid: MUUID): Promise<any> {
    return await this.areaModel.findOneAndUpdate({ 'metadata.area_id': uuid }, { $set: { _deleting: new Date() } })
  }
}
