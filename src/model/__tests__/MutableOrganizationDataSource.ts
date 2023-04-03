import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'

import MutableOrganizationDataSource, { createInstance as createOrgInstance } from '../MutableOrganizationDataSource.js'
import MutableAreaDataSource, { createInstance as createAreaInstance } from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getOrganizationModel } from '../../db/index.js'
import { OrganizationEditableFieldsType, OrgType } from '../../db/OrganizationTypes.js'
import { AreaType } from '../../db/AreaTypes.js'

describe('Organization', () => {
  let organizations: MutableOrganizationDataSource
  let areas: MutableAreaDataSource
  let usa: AreaType
  let ca: AreaType
  let wa: AreaType
  const muuidToString = (muuid: MUUID): string => muuid.toUUID().toString()
  const testUser = muuid.v4()

  beforeAll(async () => {
    await connectDB()

    try {
      await getOrganizationModel().collection.drop()
      await getAreaModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up db before test', e)
    }
    await createIndexes()
    organizations = createOrgInstance()
    areas = createAreaInstance()
    usa = await areas.addCountry('usa')
    ca = await areas.addArea(testUser, 'CA', usa.metadata.area_id)
    wa = await areas.addArea(testUser, 'WA', usa.metadata.area_id)
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should create an organization that is retrievable', async () => {
    const newOrg = await organizations.addOrganization(testUser, 'Friends of OpenBeta', OrgType.localClimbingOrganization)
    expect(newOrg.displayName).toEqual('Friends of OpenBeta')
    expect(newOrg.associatedAreaIds).toEqual([])

    const orgIdSearchRes = await organizations.findOneOrganizationByUUID(newOrg.orgId)
    expect(orgIdSearchRes._id).toEqual(newOrg._id)

    // Match should be case-insensitive.
    const displayNameSearchRes = await (await organizations.findOrganizationsByFilter({ displayName: { match: 'openbeta', exactMatch: false } })).toArray()
    expect(displayNameSearchRes).toHaveLength(1)
    expect(displayNameSearchRes[0]._id).toEqual(newOrg._id)
  })

  describe('update', () => {
    let baseUpdateDocument: OrganizationEditableFieldsType
    beforeAll(() => {
      baseUpdateDocument = {
        associatedAreaIds: [usa.metadata.area_id],
        excludedAreaIds: [ca.metadata.area_id, wa.metadata.area_id],
        displayName: 'Friends of Openbeta',
        website: 'https://www.friendsofopenbeta.com',
        email: 'admin@friendsofopenbeta.com',
        donationLink: 'https://www.friendsofopenbeta.com/donate',
        instagramLink: 'https://www.instagram.com/friendsofopenbeta',
        description: 'We are friends of openbeta.\nWe are a 503(B) corporation.'
      }
    })

    it('should succeed on valid input', async () => {
      const newOrg = await organizations.addOrganization(testUser, 'Foe of OpenBeta', OrgType.localClimbingOrganization)
      const document = { ...baseUpdateDocument }
      const updatedOrg = await organizations.updateOrganization(testUser, newOrg.orgId, document)

      expect(updatedOrg).toBeDefined()
      if (updatedOrg == null) { fail('should not reach here.') }
      expect(updatedOrg.associatedAreaIds.map(muuidToString).sort())
        .toStrictEqual(document.associatedAreaIds.map(muuidToString).sort())
      expect(updatedOrg.excludedAreaIds.map(muuidToString).sort())
        .toStrictEqual(document.excludedAreaIds.map(muuidToString).sort())
      expect(updatedOrg.displayName).toBe(document.displayName)
      expect(updatedOrg.content?.website).toBe(document.website)
      expect(updatedOrg.content?.email).toBe(document.email)
      expect(updatedOrg.content?.donationLink).toBe(document.donationLink)
      expect(updatedOrg.content?.instagramLink).toBe(document.instagramLink)
      expect(updatedOrg.content?.description).toBe(document.description)
      expect(updatedOrg._change?.operation).toBe('updateOrganization')
      expect(updatedOrg._change?.seq).toBe(0)
      expect(updatedOrg.updatedAt?.getTime()).toBeGreaterThan(updatedOrg.createdAt!.getTime())
    })

    it('should throw when an invalid area is supplied', async () => {
      const newOrg = await organizations.addOrganization(testUser, 'Friends of OpenBeta', OrgType.localClimbingOrganization)
      const document = {
        ...baseUpdateDocument,
        associatedAreaIds: [muuid.v4()]
      }
      await expect(organizations.updateOrganization(testUser, newOrg.orgId, document))
        .rejects
        .toThrow(/Organization update error. Reason: Associated areas not found: /)
    })
  })
})
