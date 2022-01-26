import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { AreaType } from '../../AreaTypes'
import { Tree, AreaNode } from './AreaTree.js'

export const createAreas = async (areas: any[], areaModel: mongoose.Model<AreaType>): Promise<number> => {
  const tree = new Tree()
  areas.forEach(record => {
    const { path }: {path: string} = record
    /* eslint-disable-next-line */
    const fullPath = `USA|${record.us_state}|${path}` // 'path' doesn't have a parent, which is a US state
    tree.insertMany(fullPath, record)
  })

  let count = 0
  const chunkSize = 100
  let chunk: AreaType[] = []
  for await (const node of tree.map.values()) {
    const area = makeDBArea(node)
    chunk.push(area)
    if (chunk.length % chunkSize === 0) {
      count = count + chunk.length
      await areaModel.insertMany(chunk, { ordered: false })
      chunk = []
    }
  }

  if (chunk.length > 0) {
    count = count + chunk.length
    await areaModel.insertMany(chunk, { ordered: false })
  }

  return count
}

/**
 * Convert simple Area tree node to Mongo Area
 * @param node
 * @returns
 */
const makeDBArea = (node: AreaNode): AreaType => {
  const { key, isLeaf, children, _id } = node
  return {
    _id,
    area_name: isLeaf ? node.jsonLine.area_name : key.substring(key.lastIndexOf('|') + 1),
    children: Array.from(children),
    metadata: {
      leaf: isLeaf,
      area_id: uuidv4(),
      lng: isLeaf ? node.jsonLine.lnglat[0] : 0,
      lat: isLeaf ? node.jsonLine.lnglat[1] : 0,
      left_right_index: -1,
      ext_id: isLeaf ? extractMpId(node.jsonLine.url) : ''
    },
    ancestors: node.getAncestors().join(','),
    pathTokens: `${key}`.split('|'),
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
