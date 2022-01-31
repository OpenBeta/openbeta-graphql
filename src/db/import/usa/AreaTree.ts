import assert from 'node:assert'
import mongoose from 'mongoose'

/**
 * A tree-like data structure for storing area hierarchy during raw json files progressing.
 */
export class Tree {
  root?: AreaNode
  subRoot: AreaNode
  map = new Map<string, AreaNode>()

  constructor (root?: AreaNode) {
    this.root = root
  }

  prefixRoot (key: string): string {
    if (this.root === undefined) {
      return key
    }
    return `${this.root.key}|${key}`
  }

  private insert (key: string, isSubRoot: boolean, isLeaf: boolean = false, jsonLine = undefined): Tree {
    if (this.map.has(key)) return this

    const newNode = new AreaNode(key, isLeaf, jsonLine, this)

    // Special case at the root node
    if (isSubRoot && this.root !== undefined) {
      this.root.children.add(newNode._id)
      this.subRoot = newNode
    } else {
      // find this new node's parent
      const parentPath = key.substring(0, key.lastIndexOf('|'))
      const parent = this.map.get(parentPath)
      if (parent === undefined) assert(false, 'Parent path exists but parent node doesn\'t')
      parent?.linkChild(newNode)
      newNode.setParent(parent)
    }

    this.map.set(key, newNode)
    return this
  }

  insertMany (path: string, jsonLine: any = undefined): Tree {
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

  atPath (path: string): AreaNode | undefined {
    return this.map.get(path)
  }

  getAncestors (node: AreaNode): mongoose.Types.ObjectId[] {
    if (this.root === undefined) {
      // Country root shouldn't have an ancestor so return itself
      return [node._id]
    }
    const pathArray: mongoose.Types.ObjectId[] = [this.root._id]
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
      pathArray.push(parent._id)
      return path
    }, '')
    return pathArray
  }

  getPathTokens (node: AreaNode): string[] {
    const { key } = node
    const tokens: string[] = key.split('|')
    if (this.root === undefined) {
      assert(tokens.length === 1, 'Country root node should not have a parent')
      return tokens
    }
    tokens.unshift(this.root.key)
    return tokens
  }
}

export class AreaNode {
  key: string
  _id = new mongoose.Types.ObjectId()
  isLeaf: boolean
  jsonLine: any = undefined
  parentRef: mongoose.Types.ObjectId | null = null
  children: Set<mongoose.Types.ObjectId> = new Set<mongoose.Types.ObjectId>()
  treeRef: Tree

  constructor (key: string, isLeaf: boolean, jsonLine = undefined, treeRef: Tree) {
    this.key = key
    this.isLeaf = isLeaf
    if (isLeaf) { // because our data files contain only leaf area data
      this.jsonLine = jsonLine
    }
    this.treeRef = treeRef
  }

  // create a ref to parent for upward traversal
  setParent (parent: AreaNode|undefined): AreaNode {
    if (parent !== undefined) {
      const { _id } = parent
      this.parentRef = _id
    }
    return this
  }

  // add a child node to this node
  linkChild (child: AreaNode): AreaNode {
    const { _id } = child
    this.children.add(_id)
    return this
  }

  /**
   * Return an array of ancestor refs of this node (inclusive)
   */
  getAncestors (): mongoose.Types.ObjectId[] {
    const a = this.treeRef.getAncestors(this)
    return a
  }

  /**
   * Return an array of ancenstor area name of this node (inclusive)
   */
  getPathTokens (): string[] {
    return this.treeRef.getPathTokens(this)
  }
}

export const createRootNode = (countryCode: string): AreaNode => {
  return new AreaNode(countryCode, false, undefined, new Tree())
}
