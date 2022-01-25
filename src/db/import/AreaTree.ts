import mongoose from 'mongoose'
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

  // add this node to parent's children got for downward traversal
  linkChild (child: AreaNode): AreaNode {
    const { _id } = child
    this.children.add(_id)
    return this
  }

  // return an array of ancestor refs
  getAncestors (): mongoose.Types.ObjectId[] {
    const a = this.treeRef.getAncestors(this)
    return a
  }
}

export class Tree {
  root: AreaNode
  map = new Map<string, AreaNode>()

  insert (key: string, isLeaf: boolean = false, jsonLine = undefined): Tree {
    if (this.map.has(key)) return this
    const newNode = new AreaNode(key, isLeaf, jsonLine, this)
    // find this new node's parent
    const parentPath = key.slice(0, key.lastIndexOf('|'))
    const parent = this.map.get(parentPath)
    parent?.linkChild(newNode)
    newNode.setParent(parent)
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
      this.insert(acc, isLeaf, jsonLine)
      return acc
    }, '')
    return this
  }

  atPath (path: string): AreaNode | undefined {
    return this.map.get(path)
  }

  getAncestors (node: AreaNode): mongoose.Types.ObjectId[] {
    const { key } = node
    const ancestors: mongoose.Types.ObjectId[] = []
    const tokens: string[] = key.split('|')
    // path = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'
    // 0. Split path into array
    // 1. Build path by concatenating each element. Add first child ('Oregon')
    // 2. Look up node.  Add node._id to ancestors
    // tokens.slice(0, tokens.length - 1).reduce<string>((path, curr) => {
    //   if (path.length === 0) {
    //     path = curr
    //   } else {
    //     path = path + '|' + curr
    //   }
    //   const parent = this.map.get(path)
    //   if (parent !== undefined) {
    //     ancestors.push(parent._id)
    //   } else {
    //     console.log('Corrupted data')
    //     return path
    //   }
    //   return path
    // }, '')

    let currentPath = key
    for (let i = currentPath.length; i > 0; i = currentPath.lastIndexOf('|')) {
      currentPath = currentPath.substring(0, i)
      const parent = this.map.get(currentPath)
      if (parent !== undefined) {
        ancestors.push(parent._id)
      } else {
        console.log('Corrupted data')
        break
      }
    }
    return ancestors
  }
}
