export interface AreaNodeType {
  key: string
  isLeaf: boolean
  // parent: string
  // path: string[]
  // childKeys: string[]
  children: Set<string>
}
export interface AreaTreeType {
  root: AreaNodeType
  insert: (key: string, isLeaf: boolean) => AreaTreeType
}

export class Node implements AreaNodeType {
  key: string
  isLeaf: boolean
  children: Set<string> = new Set<string>()
  constructor (key: string, isLeaf: boolean) {
    this.key = key
    this.isLeaf = isLeaf
  }
}

export class Tree implements AreaTreeType {
  root: AreaNodeType
  map = new Map<string, AreaNodeType>()

  // constructor (rootKey: string) {
  //   // this.insert(rootKey)
  // }

  insert (key: string, isLeaf: boolean = false): AreaTreeType {
    if (this.map.has(key)) return this
    // const tokens = key.split('|')
    const parentPath = key.slice(0, key.lastIndexOf('|'))
    const parent = this.map.get(parentPath)
    parent?.children.add(key)
    const node = new Node(key, isLeaf)
    this.map.set(key, node)
    return this
  }

  insertMany (path: string): AreaTreeType {
    const tokens: string[] = path.split('|')
    tokens.reduce<string>((acc, curr, index) => {
      if (acc.length === 0) {
        acc = curr
      } else {
        acc = acc + '|' + curr
      }
      this.insert(acc, index === tokens.length - 1)
      return acc
    }, '')
    return this
  }

  atPath (path: string): AreaNodeType | undefined {
    return this.map.get(path)
  }
}
