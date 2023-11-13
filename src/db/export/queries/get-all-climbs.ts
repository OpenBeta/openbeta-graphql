import { ClimbExtType } from '../../ClimbTypes'
import { getClimbModel } from '../../ClimbSchema'
import { DEFAULT_CHUNK_SIZE } from './defaults'

/**
 * SQL equivalent:
 *
 * SELECT climbs.*, areas.ancestors, areas.pathTokens
 * FROM climbs left join areas on areas.metadata.area_id = climbs.metadata.areaRef;
 */
export async function * getAllClimbs (chunkSize: number = DEFAULT_CHUNK_SIZE): AsyncGenerator<ClimbExtType[], void, unknown> {
  let pageNum = 0

  while (true) {
    const page = await getClimbModel()
      .aggregate<ClimbExtType>([
      {
        $lookup: {
          from: 'areas', // other collection name
          localField: 'metadata.areaRef',
          foreignField: 'metadata.area_id',
          as: 'area', // clobber array of climb IDs with climb objects
          pipeline: [
            {
              $project: {
                // only include specific fields
                _id: 0,
                ancestors: 1,
                pathTokens: 1
              }
            }
          ]
        }
      },
      { $unwind: '$area' }, // Previous stage returns as an array of 1 element. 'unwind' turn it into an object.
      {
        $replaceWith: {
          // Merge area.* with top-level object
          $mergeObjects: ['$$ROOT', '$area']
        }
      }
    ])
      .skip(pageNum * chunkSize)
      .limit(chunkSize)

    if (page.length === 0) {
      return
    }

    yield page
    pageNum += 1
  }
}
