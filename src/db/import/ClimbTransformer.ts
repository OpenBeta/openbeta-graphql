import { ClimbType } from '../ClimbTypes.js'
import { v4 as uuidv4 } from 'uuid'

const transformClimbRecord = (row: any): ClimbType[] => {
  /* eslint-disable-next-line */
  const { route_name, grade, safety, type, fa, metadata, description, protection, location } = row
  /* eslint-disable-next-line */
  const { parent_lnglat, left_right_seq, mp_route_id } = metadata
  return [{
    name: route_name,
    yds: grade.YDS,
    safety: safety,
    type: type,
    fa: fa,
    metadata: {
      climb_id: uuidv4(),
      lng: parent_lnglat[0],
      lat: parent_lnglat[1],
      left_right_index: left_right_seq,
      mp_id: mp_route_id
    },
    content: {
      description: Array.isArray(description) ? description.join('\n\n') : '',
      location: Array.isArray(location) ? location.join('\n\n') : '',
      protection: Array.isArray(protection) ? protection.join('\n\n') : ''
    }
  }]
}

export default transformClimbRecord
