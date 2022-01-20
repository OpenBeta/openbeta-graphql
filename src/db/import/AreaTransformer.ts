import { AreaType } from '../AreaTypes'
import { v4 as uuidv4 } from 'uuid'

const transformAreaRecord = (row: any): AreaType[] => {
  /* eslint-disable-next-line */
  const { area_name, metadata, description, url, lnglat } = row
  /* eslint-disable-next-line */
  const { parent_lnglat, left_right_seq } = metadata
  const leafArea: AreaType = {
    area_name: area_name,
    metadata: {
      leaf: true,
      area_id: uuidv4(),
      lng: lnglat[0],
      lat: lnglat[1],
      left_right_index: -1,
      mp_id: 'TBD' // TODO extract id from url
    },
    ancestors: [],
    parentHashRef: 'TBD',
    pathHash: 'TBD',
    pathTokens: [],
    aggregate: {
      byGrade: [],
      byType: []
    },
    density: 0,
    bounds: undefined,
    totalClimbs: 0,
    content: {
      description: Array.isArray(description) ? description.join('\n\n') : ''
    }
  }

  const ancestors = createAncestorsFromLeaf(leafArea, row)
  return [leafArea].concat(ancestors)
}

export const createAncestorsFromLeaf = (leafArea: AreaType, leafRow: any): AreaType[] => {
  const pathTokens: string[] = leafRow.path.split('|')
  pathTokens.pop() // last element is leaf, which we already have
  return pathTokens.reduce<any>((acc, current) => {
    const area = {
      ...leafArea,
      area_name: current,
      metadata: {
        ...leafArea.metadata,
        leaf: false,
        area_id: uuidv4()
      }
    }
    acc.push(area)
    return acc
  }, [])
}

export default transformAreaRecord
