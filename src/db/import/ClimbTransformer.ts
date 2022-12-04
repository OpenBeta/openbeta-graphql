import { geometry, Point } from '@turf/helpers'
import { ClimbType } from '../ClimbTypes.js'
import muuid from 'uuid-mongodb'
import { v5 as uuidv5, NIL } from 'uuid'

const transformClimbRecord = (row: any): ClimbType => {
  /* eslint-disable-next-line */
  const { route_name, grade, gradeContext, safety, type, fa, metadata, description, protection, location } = row
  /* eslint-disable-next-line */
  const { parent_lnglat, left_right_seq, mp_route_id, mp_sector_id } = metadata

  // in case mp_route_id is empty
  const pkeyStr = mp_route_id === '' ? `${mp_sector_id as string}.${left_right_seq as string}` : mp_route_id
  const uuid = muuid.from(uuidv5(pkeyStr, NIL))
  return {
    _id: uuid,
    name: route_name,
    yds: grade.YDS,
    grades: {
      yds: grade.YDS,
      font: grade.Font,
      french: grade.French
    },
    gradeContext: gradeContext,
    safety: safety,
    type: type,
    fa: fa,
    metadata: {
      lnglat: geometry('Point', parent_lnglat) as Point,
      left_right_index: left_right_seq,
      mp_id: mp_route_id,
      mp_crag_id: mp_sector_id,
      areaRef: muuid.from(uuidv5(mp_sector_id, NIL))
    },
    content: {
      description: Array.isArray(description) ? description.join('\n\n') : '',
      location: Array.isArray(location) ? location.join('\n\n') : '',
      protection: Array.isArray(protection) ? protection.join('\n\n') : ''
    }
  }
}

export default transformClimbRecord
