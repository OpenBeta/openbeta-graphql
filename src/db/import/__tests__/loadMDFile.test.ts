import { loadMdFile } from '../utils'
import { transformClimb } from '../ClimbMDTransformer.js'

// test('load climb markdown with extra H1s', () => {
//   const data = loadMdFile(new URL('climb1.md', import.meta.url), null, transformClimb)
//   expect(data).toStrictEqual(expectedClimbData)
// })

// test('load climb markdown with exactly 3 H1s', () => {
//   const data = loadMdFile(new URL('climb2.md', import.meta.url), null, transformClimb)
//   expect(data).toStrictEqual(expectedClimbData)
// })

// test('load climb markdown < 3 H1s', () => {
//   const data = loadMdFile(new URL('climb3.md', import.meta.url), null, transformClimb)
//   expect(data).toStrictEqual({ ...expectedClimbData, content: { description: '', location: '', protection: '' } })
// })

export const expectedClimbData = {
  route_name: 'Qatari Ardah',
  fa: 'Yannick Gingras and Max Huecksteadt, Sept. 2021',
  yds: '5.11a',
  type: { trad: true },
  safety: '',
  metadata: {
    lng: -121.56844748,
    lat: 45.4054821,
    left_right_index: '5',
    climb_id: 'c89d1225-e8ee-4592-829c-e814d7b803b3',
    mp_id: ''
  },
  content: {
    description: 'First line\n\nSecond paragraph',
    location: 'About 20 yards left of Quiet Ninja. The huge first roof is impossible to miss.',
    protection: 'Doubles from Black Totem to C4 #2, singles of C4 #3 and #4, single Metolius #0, offset nuts. Triples of blue and yellow Totems useful.'
  }
}
