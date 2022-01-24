import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { AreaType } from '../AreaTypes'
import { Tree, AreaNodeType, AreaTreeType } from './AreaTree'
export interface AccummulatorType<T> {
  line: any
  record: T
}

const transformAreaRecord = (row: any): AreaType => {
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
  return leafArea
}

// const areaComparator = (a: AccummulatorType<AreaType>, b: AccummulatorType<AreaType>): number => {
//   return a.line.path?.localeCompare(b.line.path)
// }

export const createNonLeafAreas = async (areas: Array<AccummulatorType<AreaType>>, areaModel: mongoose.Model<AreaType>): Promise<void> => {
  const tree = new Tree()
  areas.forEach(entry => {
    const { line } = entry
    const { path }: {path: string} = line
    /* eslint-disable-next-line */
    const fullPath = `${line.us_state}|${path}` // 'path' doesn't have a parent, which is the US state
    tree.insertMany(fullPath)
  })
  return await Promise.resolve()
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
