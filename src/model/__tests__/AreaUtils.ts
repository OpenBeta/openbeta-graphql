// import muid from 'uuid-mongodb'
import { genMUIDFromPaths } from '../MutableAreaDataSource.js'

describe('Test area utilities', () => {
  it('generates UUID from area tokens', () => {
    const paths = ['USA', 'Red Rocks']
    const uid = genMUIDFromPaths(paths, 'Calico Basin')

    expect(uid.toUUID().toString()).toEqual('9fbc30ab-82d7-5d74-85b1-9bec5ee00388')
    expect(paths).toHaveLength(2) // make sure we're not changing the input!
  })
})
