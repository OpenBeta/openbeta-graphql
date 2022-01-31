import { extractMpId } from '../AreaTransformer'

test('Verify area url parser', () => {
  expect(extractMpId('/area/117795688/foo-bar')).toEqual('117795688')
  // test again since Regex matcher can be stateful
  expect(extractMpId('/area/123/abc')).toEqual('123')
  expect(extractMpId('/area//apple')).toEqual(undefined)
})
