import { Tree } from '../AreaTree'

const path1 = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'
const path2 = 'Oregon|Central Oregon|Smith Rock|Spiderman Buttress'

describe('Area Tree data structure', () => {
  it('should create a tree from path string', () => {
    const tree = new Tree()
    tree.insertMany(path1)
    expect(tree.map.size).toEqual(path1.split('|').length)
    expect(tree.atPath('Oregon|Central Oregon')?.children.size).toEqual(1)
  })

  it('shoud add a branch', () => {
    const tree = new Tree()
    tree.insertMany(path1)
    tree.insertMany(path2) // Central Oregon should now have 2 children

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

  it('returns path', () => {
    const tree = new Tree()
    tree.insertMany(path1)
    const leaf = tree.atPath(path1)
    const root = tree.atPath('Oregon')
    if (leaf !== undefined) {
      const ancestors = leaf.getAncestors()
      console.log(ancestors)
      expect(ancestors.length).toEqual(5)
      expect(ancestors[0]).toEqual(root?._id)
    }
  })
})
