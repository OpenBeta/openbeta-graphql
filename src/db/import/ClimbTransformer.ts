import { geometry, Point } from '@turf/helpers'
import muuid from 'uuid-mongodb'
import { v5 as uuidv5, NIL } from 'uuid'

import { ClimbType } from '../ClimbTypes.js'
import { defaultDisciplines, sanitizeDisciplines } from '../../GradeUtils.js'

const transformClimbRecord = (row: any): ClimbType => {
  /* eslint-disable-next-line */
  const { route_name, grade, gradeContext, safety, type, fa, metadata, description, protection, location } = row
  /* eslint-disable-next-line */
  const { parent_lnglat, left_right_seq, mp_route_id, mp_sector_id } = metadata

  // in case mp_route_id is empty
  const pkeyStr = mp_route_id === '' ? `${mp_sector_id as string}.${left_right_seq as string}` : mp_route_id
  const uuid = muuid.from(uuidv5(pkeyStr, NIL))
  const disciplines = sanitizeDisciplines(type) ?? defaultDisciplines()

  const boulderingDiscipline = disciplines.bouldering === true ? { vscale: grade.YDS } : {}

  return {
    _id: uuid,
    name: route_name,
    yds: grade.YDS,
    grades: {
      ...boulderingDiscipline,
      yds: grade.YDS,
      font: grade.Font,
      french: grade.French,
      uiaa: grade.UIAA
    },
    gradeContext: gradeContext,
    safety: safety,
    type: disciplines,
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
