import { Tree } from '../AreaTree'

const path1 = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'

test('build tree', () => {
  const path2 = 'Oregon|Central Oregon|Smith Rock|Spiderman Buttress'
  const tree = new Tree()
  tree.insertMany(path1)
  expect(tree.map.size).toEqual(path1.split('|').length)

  const node = tree.atPath('Oregon|Central Oregon')

  expect(node?.children.size).toEqual(1)
  // const child = node?.children
  // .expect(node?.children.has('Oregon|Central Oregon|Paulina Peak')).toEqual(true)

  // tree.insertMany(path2)

  // expect(tree.atPath('Oregon')?.children.size).toEqual(1)
  // node = tree.atPath('Oregon|Central Oregon')
  // expect(node?.children.size).toEqual(2)
  // expect(node?.children.has('Oregon|Central Oregon|Paulina Peak')).toEqual(true)
  // expect(node?.children.has('Oregon|Central Oregon|Smith Rock')).toEqual(true)
})

test('get ancestors', () => {
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
