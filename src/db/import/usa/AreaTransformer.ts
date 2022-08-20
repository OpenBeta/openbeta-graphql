import mongoose from 'mongoose'
import { geometry, Point } from '@turf/helpers'
import { getAreaModel } from '../../AreaSchema.js'
import { AreaType } from '../../AreaTypes'
import { Tree, AreaNode, createRootNode } from './AreaTree.js'
import { MUUID } from 'uuid-mongodb'

export const createRootInDB = async (areaModel: mongoose.Model<AreaType>, countryCode: string): Promise<AreaType> => {
  const countryNode = createRootNode(countryCode)
  const doc = makeDBArea(countryNode)
  const f = await areaModel.insertMany(doc, { ordered: false })
  const singleDoc = f[0]
  return singleDoc
}

export const createRoot = async (countryCode: string): Promise<AreaNode> => {
  const areaModel = getAreaModel('areas')
  const countryNode = createRootNode(countryCode)
  const doc = makeDBArea(countryNode)
  await areaModel.insertMany(doc, { ordered: false })
  return countryNode
}

export const createAreas = async (root: AreaNode, areas: any[], areaModel: mongoose.Model<AreaType>): Promise<number> => {
  // Build a tree from each record in the state data file
  const tree = new Tree(root)
  areas.forEach(record => {
    const { path }: {path: string} = record
    /* eslint-disable-next-line */
    const fullPath = `${record.us_state}|${path}` // 'path' doesn't have a parent (a US state)
    tree.insertMany(fullPath, record)
  })

  // Find the USA node in the db and add USA.children[]
  // $push is used here because children[] may already have other states
  await areaModel.findOneAndUpdate({ _id: root._id }, { $push: { children: tree.subRoot._id } })

  // For each node in the tree, insert it to the database
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
export const makeDBArea = (node: AreaNode): AreaType => {
  const { key, isLeaf, children, _id, uuid } = node

  return {
    _id,
    shortCode: '',
    area_name: isLeaf ? node.jsonLine.area_name : key.substring(key.lastIndexOf('|') + 1),
    children: Array.from(children),
    metadata: {
      isDestination: false,
      leaf: isLeaf,
      lnglat: geometry('Point', isLeaf ? node.jsonLine.lnglat : [0, 0]) as Point,
      bbox: [-180, -90, 180, 90],
      left_right_index: -1,
      ext_id: isLeaf ? extractMpId(node.jsonLine.url) : ''
    },
    ancestors: uuidArrayToString(node.getAncestors()),
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

/**
 * Similar to String.join(',') but also convert each UUID to string before joining them
 * @param a
 * @returns
 */
const uuidArrayToString = (a: MUUID[]): string => {
  return a.reduce((acc: string, curr: MUUID, index) => {
    acc = acc + curr.toUUID().toString()
    if (index < a.length - 1) acc = acc + ','
    return acc
  }, '')
}
