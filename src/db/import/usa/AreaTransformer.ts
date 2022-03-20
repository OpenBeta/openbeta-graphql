import mongoose from 'mongoose'
import { v4 as uuidv4 } from 'uuid'
import { geometry, Point } from '@turf/helpers'
import { getAreaModel } from '../../AreaSchema.js'
import { AreaType } from '../../AreaTypes'
import { Tree, AreaNode, createRootNode } from './AreaTree.js'

export const createRoot = async (countryCode: string): Promise<AreaNode> => {
  const areaModel = getAreaModel('areas')
  const countryNode = createRootNode(countryCode)
  const doc = makeDBArea(countryNode)
  await areaModel.insertMany(doc, { ordered: false })
  return countryNode
}

export const createAreas = async (root: AreaNode, areas: any[], areaModel: mongoose.Model<AreaType>): Promise<number> => {
  const tree = new Tree(root) // todo: needs to receive a common root
  areas.forEach(record => {
    const { path }: {path: string} = record
    /* eslint-disable-next-line */
    const fullPath = `${record.us_state}|${path}` // 'path' doesn't have a parent, which is a US state
    tree.insertMany(fullPath, record)
  })

  // todo update root children in db

  await areaModel.findOneAndUpdate({ _id: root._id }, { $push: { children: tree.subRoot._id } })

  let count = 0
  const chunkSize = 50
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
      lnglat: geometry('Point', isLeaf ? node.jsonLine.lnglat : [0, 0]) as Point,
      bbox: [-180, -90, 180, 90],
      left_right_index: -1,
      ext_id: isLeaf ? extractMpId(node.jsonLine.url) : ''
    },
    ancestors: node.getAncestors().join(','),
    climbs: [],
    pathTokens: node.getPathTokens(),
    aggregate: {
      byGrade: [],
      byDiscipline: {},
      byGradeBand: {
        beginner: 0,
        intermediate: 0,
        advance: 0,
        expert: 0
      }
    },
    density: 0,
    totalClimbs: 0,
    content: {
      description: isLeaf ? (Array.isArray(node.jsonLine.description) ? node.jsonLine.description.join('\n\n') : '') : ''
    }
  }
}

const URL_REGEX = /area\/(?<id>\d+)\//
export const extractMpId = (url: string): string | undefined => URL_REGEX.exec(url)?.groups?.id
