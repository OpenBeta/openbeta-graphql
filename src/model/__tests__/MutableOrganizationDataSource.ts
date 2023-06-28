import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'

import MutableOrganizationDataSource from '../MutableOrganizationDataSource.js'
import MutableAreaDataSource from '../MutableAreaDataSource.js'
import { connectDB, createIndexes, getAreaModel, getOrganizationModel } from '../../db/index.js'
import { OrganizationEditableFieldsType, OrgType } from '../../db/OrganizationTypes.js'
import { AreaType } from '../../db/AreaTypes.js'
import { muuidToString } from '../../utils/helpers.js'

describe('Organization', () => {
  let organizations: MutableOrganizationDataSource
  let areas: MutableAreaDataSource
  let usa: AreaType
  let ca: AreaType
  let wa: AreaType
  let fullOrg: OrganizationEditableFieldsType
  let emptyOrg: OrganizationEditableFieldsType
  const testUser = muuid.v4()

  beforeAll(async () => {
    await connectDB()
    try { // Use the same fixed areas for testing so no need to drop and re-create on each test.
      await getAreaModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up area model before test', e)
    }
    organizations = MutableOrganizationDataSource.getInstance()
    areas = MutableAreaDataSource.getInstance()
    usa = await areas.addCountry('usa')
    ca = await areas.addArea(testUser, 'CA', usa.metadata.area_id)
    wa = await areas.addArea(testUser, 'WA', usa.metadata.area_id)
    fullOrg = {
      associatedAreaIds: [usa.metadata.area_id],
      excludedAreaIds: [ca.metadata.area_id, wa.metadata.area_id],
      displayName: 'Friends of Openbeta',
      website: 'https://www.friendsofopenbeta.com',
      email: 'admin@friendsofopenbeta.com',
      donationLink: 'https://www.friendsofopenbeta.com/donate',
      instagramLink: 'https://www.instagram.com/friendsofopenbeta',
      facebookLink: 'https://www.facebook.com/friendsofopenbeta',
      hardwareReportLink: 'https://www.friendsofopenbeta.com/reporthardware',
      description: 'We are friends of openbeta.\nWe are a 503(B) corporation.'
    }
    emptyOrg = {
      displayName: 'Foes of Openbeta'
    }
  })

  beforeEach(async () => {
    try {
      await getOrganizationModel().collection.drop()
    } catch (e) {
      console.log('Cleaning up organization model before test', e)
    }
    await createIndexes()
  })

  afterAll(async () => {
    await mongoose.connection.close()
  })

  it('should successfully create a document when passed valid input', async () => {
    const newOrg = await organizations.addOrganization(testUser, OrgType.localClimbingOrganization, fullOrg)
    const document = { ...fullOrg }
    expect(newOrg.displayName).toBe(document.displayName)
    expect(newOrg.content?.website).toBe(document.website)
    expect(newOrg.content?.email).toBe(document.email)
    expect(newOrg.content?.donationLink).toBe(document.donationLink)
    expect(newOrg.content?.instagramLink).toBe(document.instagramLink)
    expect(newOrg.content?.facebookLink).toBe(document.facebookLink)
    expect(newOrg.content?.hardwareReportLink).toBe(document.hardwareReportLink)
    expect(newOrg.content?.description).toBe(document.description)
    expect(newOrg.associatedAreaIds.map(muuidToString)).toEqual([muuidToString(usa.metadata.area_id)])
    expect(newOrg._change?.operation).toBe('addOrganization')
    expect(newOrg._change?.seq).toBe(0)

    const orgIdSearchRes = await organizations.findOneOrganizationByOrgId(newOrg.orgId)
    expect(orgIdSearchRes._id).toEqual(newOrg._id)
  })

  it('should retrieve documents based on displayName', async () => {
    const newOrg = await organizations.addOrganization(testUser, OrgType.localClimbingOrganization, fullOrg)
    // Match should be case-insensitive.
    const displayNameSearchCursor = await organizations.findOrganizationsByFilter({ displayName: { match: 'openbeta', exactMatch: false } })
    const displayNameSearchRes = await displayNameSearchCursor.toArray()
    expect(displayNameSearchRes).toHaveLength(1)
    expect(displayNameSearchRes[0]._id).toEqual(newOrg._id)
  })

  it('should retrieve documents based on associatedAreaIds', async () => {
    const newOrg = await organizations.addOrganization(testUser, OrgType.localClimbingOrganization, fullOrg)
    const document = {
      associatedAreaIds: [ca.metadata.area_id, wa.metadata.area_id]
    }
    await organizations.updateOrganization(testUser, newOrg.orgId, document)
    const areaIdSearchCursor = await organizations.findOrganizationsByFilter({ associatedAreaIds: { includes: [ca.metadata.area_id] } })
    const areaIdSearchRes = await areaIdSearchCursor.toArray()
    expect(areaIdSearchRes).toHaveLength(1)
    expect(areaIdSearchRes[0]._id).toEqual(newOrg._id)
  })

  describe('update', () => {
    it('should succeed on valid input', async () => {
      const newOrg = await organizations.addOrganization(testUser, OrgType.localClimbingOrganization, emptyOrg)
      const document = { ...fullOrg }
      const updatedOrg = await organizations.updateOrganization(testUser, newOrg.orgId, document)

      expect(updatedOrg).toBeDefined()
      if (updatedOrg == null) { fail('should not reach here.') }
      expect(updatedOrg.associatedAreaIds.map(muuidToString).sort())
        .toStrictEqual(document?.associatedAreaIds?.map(muuidToString).sort())
      expect(updatedOrg.excludedAreaIds.map(muuidToString).sort())
        .toStrictEqual(document?.excludedAreaIds?.map(muuidToString).sort())
      expect(updatedOrg.displayName).toBe(document.displayName)
      expect(updatedOrg.content?.website).toBe(document.website)
      expect(updatedOrg.content?.email).toBe(document.email)
      expect(updatedOrg.content?.donationLink).toBe(document.donationLink)
      expect(updatedOrg.content?.instagramLink).toBe(document.instagramLink)
      expect(updatedOrg.content?.facebookLink).toBe(document.facebookLink)
      expect(updatedOrg.content?.hardwareReportLink).toBe(document.hardwareReportLink)
      expect(updatedOrg.content?.description).toBe(document.description)
      expect(updatedOrg._change?.operation).toBe('updateOrganization')
      expect(updatedOrg._change?.seq).toBe(0)
      expect(updatedOrg.updatedAt?.getTime()).toBeGreaterThan(updatedOrg.createdAt.getTime())
    })

    it('should throw when an invalid area is supplied', async () => {
      const newOrg = await organizations.addOrganization(testUser, OrgType.localClimbingOrganization, emptyOrg)
      const document = {
        ...fullOrg,
        associatedAreaIds: [muuid.v4()]
      }
      await expect(organizations.updateOrganization(testUser, newOrg.orgId, document))
        .rejects
        .toThrow(/Organization update error. Reason: Associated areas not found: /)
    })
  })
})
