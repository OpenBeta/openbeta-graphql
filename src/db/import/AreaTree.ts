export class AreaNode {
  key: string
  isLeaf: boolean
  jsonLine: any = undefined
  children: Set<string> = new Set<string>()
  constructor (key: string, isLeaf: boolean, jsonLine = undefined) {
    this.key = key
    this.isLeaf = isLeaf
    if (isLeaf) { // because our data files contain only leaf area data
      this.jsonLine = jsonLine
    }
  }
}

export class Tree {
  root: AreaNode
  map = new Map<string, AreaNode>()

  insert (key: string, isLeaf: boolean = false, jsonLine = undefined): Tree {
    if (this.map.has(key)) return this
    const parentPath = key.slice(0, key.lastIndexOf('|'))
    const parent = this.map.get(parentPath)
    parent?.children.add(key)
    const node = new AreaNode(key, isLeaf, jsonLine)
    this.map.set(key, node)
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

  // forEach (nodeCallback: (node: AreaNode) => any): void {
  //   this.map.
  //   this.map.forEach(nodeCallback)
  // }
}
