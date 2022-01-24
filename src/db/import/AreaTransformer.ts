import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { AreaType } from '../AreaTypes'
import { Tree, AreaNode } from './AreaTree.js'
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
    const fullPath = `${line.us_state}|${path}` // 'path' doesn't have a parent, which is a US state
    tree.insertMany(fullPath, line)
  })
  const chunkSize = 100
  let chunk: AreaType[] = []
  for await (const node of tree.map.values()) {
    const area = makeDBArea(node)
    chunk.push(area)
    if (chunk.length % chunkSize === 0) {
      await areaModel.insertMany(chunk, { ordered: false })
      chunk = []
    }
  }
  if (chunk.length > 0) {
    await areaModel.insertMany(chunk, { ordered: false })
  }
  return await Promise.resolve()
}

const makeDBArea = (node: AreaNode): AreaType => {
  const { key, isLeaf } = node
  return {
    area_name: isLeaf ? node.jsonLine.area_name : key.substring(key.lastIndexOf('|') + 1),
    metadata: {
      leaf: isLeaf,
      area_id: uuidv4(),
      lng: isLeaf ? node.jsonLine.lnglat[0] : 0,
      lat: isLeaf ? node.jsonLine.lnglat[1] : 0,
      left_right_index: -1,
      mp_id: isLeaf ? extractMpId(node.jsonLine.url) : ''
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
      description: isLeaf ? (Array.isArray(node.jsonLine.description) ? node.jsonLine.description.join('\n\n') : '') : ''
    }
  }
}
const URL_REGEX = /area\/(?<id>\d+)\//
export const extractMpId = (url: string): string | undefined => URL_REGEX.exec(url)?.groups?.id

export default transformAreaRecord
