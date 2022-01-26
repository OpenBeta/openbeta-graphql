import mongoose from 'mongoose'
import { AreaType } from '../../AreaTypes.js'
import { ClimbType } from '../../ClimbTypes.js'

/**
 * Embed climbs as subdocuments of Area.climbs[] aka add climbs to correspnding crags.
 * We need to do this because climbs and areas are stored in 2 separate json files.
 * 1.  Group climbs in climb model by crag_id
 * 2.  For each group, find the corresponding crag and update their climbs
 * @param climbModel
 * @param areaModel
 * @returns void
 */
export const addClimbsToAreas = async (
  climbModel: mongoose.Model<ClimbType>,
  areaModel: mongoose.Model<AreaType>): Promise<void> => {
  const climbsGroupByCrag = await climbModel.aggregate([
    { $group: { _id: '$metadata.mp_crag_id', climbs: { $push: '$$ROOT' } } }
  ])

  for await (const climbGroup of climbsGroupByCrag) {
    const cragId = climbGroup._id
    await areaModel.findOneAndUpdate({ 'metadata.ext_id': cragId }, { climbs: climbGroup.climbs }).clone()
  }
  return await Promise.resolve()
}
