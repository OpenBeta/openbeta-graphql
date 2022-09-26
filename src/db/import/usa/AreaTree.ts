import assert from 'node:assert'
import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { v5 as uuidv5, NIL } from 'uuid'
import { getCountriesDefaultGradeContext } from '../../../grade-utils.js'

/**
 * A tree-like data structure for storing area hierarchy during raw json files progressing.
 */
export class Tree {
  root?: AreaNode
  subRoot: AreaNode
  map = new Map<string, AreaNode>()

  constructor(root?: AreaNode) {
    this.root = root
  }

  prefixRoot(key: string): string {
    if (this.root === undefined) {
      return key
    }
    return `${this.root.key}|${key}`
  }

  private insert(
    key: string,
    isSubRoot: boolean,
    isLeaf: boolean = false,
    jsonLine = undefined
  ): Tree {
    if (this.map.has(key)) return this

    const newNode = new AreaNode(key, isLeaf, jsonLine, this)

    // Special case at the root node
    if (isSubRoot && this.root !== undefined) {
      this.root.children.add(newNode._id)
      this.subRoot = newNode
    } else {
      // find this new node's parent
      const parent = this.getParent(key)
      if (parent === undefined) assert(false, "Parent path exists but parent node doesn't")
      parent?.linkChild(newNode)
      newNode.setParent(parent)
    }

    this.map.set(key, newNode)
    return this
  }

  insertMany(path: string, jsonLine: any = undefined): Tree {
    const tokens: string[] = path.split('|')
    tokens.reduce<string>((acc, curr, index) => {
      if (acc.length === 0) {
        acc = curr
      } else {
        acc = acc + '|' + curr
      }
      const isLeaf = index === tokens.length - 1
      const isSubRoot = index === 0
      this.insert(acc, isSubRoot, isLeaf, jsonLine)
      return acc
    }, '')
    return this
  }

  getParent(key: string): AreaNode | undefined {
    const parentPath = key.substring(0, key.lastIndexOf('|'))
    const parent = this.atPath(parentPath)
    return parent
  }

  atPath(path: string): AreaNode | undefined {
    return this.map.get(path)
  }

  getAncestors(node: AreaNode): MUUID[] {
    if (this.root === undefined) {
      // Country root shouldn't have an ancestor so return itself
      return [node.uuid]
    }
    const pathArray: MUUID[] = [this.root.uuid]
    const { key } = node
    const tokens: string[] = key.split('|')

    // Example node.key = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'
    // 0. Split key into array
    // 1. Reconstruct key str by concatenating each array element. Oregon, Oregon|Central Oregon, Oregon|Central Oregon|Paulina Peak
    // 2. In each iteration, look up node by key.  Add node._id to pathArray[]
    tokens.reduce<string>((path, curr) => {
      if (path.length === 0) {
        path = curr
      } else {
        path = path + '|' + curr
      }
      const parent = this.map.get(path)
      assert(parent !== undefined, 'Parent should exist')
      pathArray.push(parent.uuid)
      return path
    }, '')
    return pathArray
  }

  getPathTokens (node: AreaNode): string[] {
    const { key, countryName } = node
    const tokens: string[] = key.split('|')

    if (this.root === undefined) {
      assert(tokens.length === 1, 'Country root node should not have a parent')
      // We're at country node
      // - `countryName` is undefined when loading data from json files
      // - we pass countryName when calling from addCountry() API
      return countryName != null ? [countryName] : tokens
    }
      // use countryName if exists
      tokens.unshift(this.root?.countryName ?? this.root.key)
      return tokens
  }
  
  /**
   *
   * @param node
   * @returns the grade context for this tree
   * Inherits from parent tree if current tree does not have one
   * Country root is the highest default grade context
   */
  getGradeContext(node: AreaNode): string {
    const countriesDefaultGradeContext = getCountriesDefaultGradeContext()
    const USGradeContext = countriesDefaultGradeContext['US']
    const { key, jsonLine } = node
    // country level, return key
    if (this.root === undefined)
      return countriesDefaultGradeContext[key] ?? USGradeContext
    // imported grade context for current area
    if (jsonLine !== undefined && jsonLine.gradeContext !== undefined)
      return jsonLine.gradeContext ?? USGradeContext
    // check grade context for parent area
    const parent = this.getParent(key)
    if (parent !== undefined) return parent.getGradeContext()
    return countriesDefaultGradeContext[this.root.key]
  }
}

export class AreaNode {
  key: string
  countryName?: string // only used by create country
  _id = new mongoose.Types.ObjectId()
  uuid: MUUID
  isLeaf: boolean
  jsonLine: any = undefined
  parentRef: mongoose.Types.ObjectId | null = null
  children: Set<mongoose.Types.ObjectId> = new Set<mongoose.Types.ObjectId>()
  treeRef: Tree

  constructor (key: string, isLeaf: boolean, jsonLine = undefined, treeRef: Tree, countryName?: string) {
    this.uuid = getUUID(key, isLeaf, jsonLine)
    this.key = key
    this.isLeaf = isLeaf
    if (isLeaf) {
      // because our data files contain only leaf area data
      this.jsonLine = jsonLine
    }
    this.treeRef = treeRef
    this.countryName = countryName
  }

  // create a ref to parent for upward traversal
  setParent(parent: AreaNode | undefined): AreaNode {
    if (parent !== undefined) {
      const { _id } = parent
      this.parentRef = _id
    }
    return this
  }

  // add a child node to this node
  linkChild(child: AreaNode): AreaNode {
    const { _id } = child
    this.children.add(_id)
    return this
  }

  /**
   * Return an array of ancestor refs of this node (inclusive)
   */
  getAncestors(): MUUID[] {
    const a = this.treeRef.getAncestors(this)
    return a
  }

  /**
   * Return an array of ancestor area name of this node (inclusive)
   */
  getPathTokens(): string[] {
    return this.treeRef.getPathTokens(this)
  }

  /**
   * Return the grade context for node
   * Inherits from parent node if current node does not have one
   */
  getGradeContext(): string {
    return this.treeRef.getGradeContext(this)
  }
}

export const createRootNode = (countryCode: string, countryName?: string): AreaNode => {
  return new AreaNode(countryCode, false, undefined, new Tree(), countryName)
}

/**
 * Generate MUUID from path  or mp id
 * @param key path (US|Oregon|Smith Rock)
 * @param isLeaf leaf node
 * @param jsonLine raw data
 * @returns MUUID
 */
export const getUUID = (key, isLeaf: boolean, jsonLine: any): MUUID => {
  let idStr = key
  if (isLeaf) {
    assert(jsonLine !== undefined)
    const extId = extractMpId(jsonLine.url)
    if (extId !== undefined) {
      idStr = extId
    }
  }
  return muuid.from(uuidv5(idStr, NIL))
}

const URL_REGEX = /area\/(?<id>\d+)\//
export const extractMpId = (url: string): string | undefined => URL_REGEX.exec(url)?.groups?.id
