import { Tree, AreaNodeType, AreaTreeType } from '../AreaTree'

test('load climb markdown with extra H1s', () => {
  const path1 = 'Oregon|Central Oregon|Paulina Peak|Vigilantes de Obsidiana|Roca Rhodales'
  const path2 = 'Oregon|Central Oregon|Smith Rock|Spiderman Buttress'
  const tree = new Tree()
  tree.insertMany(path1)
  expect(tree.map.size).toEqual(path1.split('|').length)

  let node = tree.atPath('Oregon|Central Oregon')

  expect(node?.children.size).toEqual(1)
  expect(node?.children.has('Oregon|Central Oregon|Paulina Peak')).toEqual(true)

  tree.insertMany(path2)

  expect(tree.atPath('Oregon')?.children.size).toEqual(1)
  node = tree.atPath('Oregon|Central Oregon')
  expect(node?.children.size).toEqual(2)
  expect(node?.children.has('Oregon|Central Oregon|Paulina Peak')).toEqual(true)
  expect(node?.children.has('Oregon|Central Oregon|Smith Rock')).toEqual(true)
})
