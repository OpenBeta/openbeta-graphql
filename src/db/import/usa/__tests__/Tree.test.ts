import { Tree, createRootNode } from '../AreaTree'

const path1 = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'
const path2 = 'Oregon|Central Oregon|Smith Rock|Spiderman Buttress'

const jsonLine1 = {
  url: '/area/117795688/foo-bar'
}

const jsonLine2 = {
  url: '/area/1234567/foo-bar'
}

describe('Area Tree data structure', () => {
  it('should create a tree from path string', () => {
    const root = createRootNode('US')
    const tree = new Tree(root)
    tree.insertMany(path1, jsonLine1)
    expect(tree.map.size).toEqual(path1.split('|').length)
    expect(tree.atPath('Oregon|Central Oregon')?.children.size).toEqual(1)
  })

  it('shoud add a branch', () => {
    const tree = new Tree(createRootNode('US'))
    tree.insertMany(path1, jsonLine1)
    tree.insertMany(path2, jsonLine2) // Central Oregon should now have 2 children

    expect(tree.atPath('Oregon')?.children.size).toEqual(1)
    const node = tree.atPath('Oregon|Central Oregon')
    expect(node?.children.size).toEqual(2)

    // verify Central Oregon children
    if (node?.children !== undefined) {
      const ids = Array.from(node.children.values())
      const child1 = tree.atPath('Oregon|Central Oregon|Paulina Peak')
      const child2 = tree.atPath('Oregon|Central Oregon|Smith Rock')
      expect([child1?._id, child2?._id]).toEqual(expect.arrayContaining(ids))
    }
  })

  it('builds complete path to root', () => {
    const countryRoot = createRootNode('US')
    const tree = new Tree(countryRoot)
    tree.insertMany(path1, jsonLine1)
    const leaf = tree.atPath(path1)
    if (leaf !== undefined) {
      const ancestors = leaf.getAncestors()
      console.log(ancestors)
      expect(ancestors.length).toEqual(path1.split('|').length + 1) // all element of path1 + 1 for US root
      expect(ancestors[0]).toEqual(countryRoot?.uuid)
      const stateRoot = tree.atPath('Oregon')
      expect(ancestors[1]).toEqual(stateRoot?.uuid)
    }
  })
})
