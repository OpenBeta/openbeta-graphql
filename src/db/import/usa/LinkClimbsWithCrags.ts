import mongoose from 'mongoose'
import { AreaType } from '../../AreaTypes'
import { ClimbType } from '../../ClimbTypes'

/**
 * Add climb IDs to Area.climbs[] aka link climbs to their corresponding crags.
 * We need this function because climbs and areas are stored in 2 separate json files.
 * 1.  Group climbs in climb model by crag_id
 * 2.  For each group, find the corresponding crag and update the 'climbs' field
 * @param climbModel
 * @param areaModel
 * @returns void
 */
export const linkClimbsWithAreas = async (
  climbModel: mongoose.Model<ClimbType>,
  areaModel: mongoose.Model<AreaType>): Promise<void> => {
  // Group all climbs by crag
  const climbsGroupByCrag: Array<{ _id: mongoose.Types.ObjectId, climbs: ClimbType[] }> = await climbModel.aggregate([
    { $group: { _id: '$metadata.areaRef', climbs: { $push: '$$ROOT._id' } } }
  ]).allowDiskUse(true)

  // Populate area.climbs array with climb IDs
  for await (const climbGroup of climbsGroupByCrag) {
    const cragId = climbGroup._id
    const { climbs } = climbGroup
    await areaModel.findOneAndUpdate({ 'metadata.area_id': cragId }, { climbs, totalClimbs: climbs.length }).clone()
  }
  return await Promise.resolve()
}
