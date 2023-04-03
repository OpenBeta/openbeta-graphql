import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MutableOrganizationDataSource, { createInstance } from '../MutableOrganizationDataSource.js'
import { connectDB, createIndexes, getOrganizationModel } from '../../db/index.js'
import { OrgType } from '../../db/OrganizationTypes.js'

describe('Organization', () => {
  let organizations: MutableOrganizationDataSource
  const testUser = muuid.v4()

  beforeAll(async () => {
    await connectDB()

    try {
      await getOrganizationModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test', e)
    }
    await createIndexes()
    organizations = createInstance()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create an organization that is retrievable', async () => {
    const newOrg = await organizations.addOrganization(testUser, 'Friends of OpenBeta', OrgType.localClimbingOrganization)
    expect(newOrg.displayName).toEqual('Friends of OpenBeta')
    expect(newOrg.associatedAreas).toEqual([])

    const orgIdSearchRes = await organizations.findOneOrganizationByUUID(newOrg.orgId)
    expect(orgIdSearchRes._id).toEqual(newOrg._id)

    // Match should be case-insensitive.
    const displayNameSearchRes = await (await organizations.findOrganizationsByFilter({ displayName: { match: 'openbeta', exactMatch: false } })).toArray()
    expect(displayNameSearchRes).toHaveLength(1)
    expect(displayNameSearchRes[0]._id).toEqual(newOrg._id)
  })
})
