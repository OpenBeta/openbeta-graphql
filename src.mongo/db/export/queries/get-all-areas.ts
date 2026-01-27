import { AreaType } from '../../AreaTypes.js'
import { getAreaModel } from '../../AreaSchema.js'
import { DEFAULT_CHUNK_SIZE } from './defaults.js'
import { getClimbModel } from '../../ClimbSchema.js'

export async function * getAllAreas (chunkSize: number = DEFAULT_CHUNK_SIZE): AsyncGenerator<AreaType[], void, unknown> {
  let pageNum = 0

  while (true) {
    const page = await getAreaModel().find<AreaType>({})
      .populate({ path: 'climbs', model: getClimbModel() })
      .limit(chunkSize)
      .skip(pageNum * chunkSize)

    if (page.length === 0) {
      return
    }

    yield page
    pageNum += 1
  }
}
