import muuid from 'uuid-mongodb'

import { OrganizationEditableFieldsType, OrganizationType, OrgType } from '../../db/OrganizationTypes.js'
import { AreaType } from '../../db/AreaTypes.js'
import { muuidToString } from '../../utils/helpers.js'
import { dataFixtures } from '../../__tests__/fixtures/data.fixtures.js'

interface LocalContext {
  excludedArea: AreaType
  orgData: OrganizationEditableFieldsType
  organization: OrganizationType
  emptyOrg: OrganizationEditableFieldsType
}

const it = dataFixtures.extend<LocalContext>({
  excludedArea: async ({ addArea }, use) => { await use(await addArea()) },

  orgData: async ({ country, excludedArea, area, task }, use) => {
    await use({
      associatedAreaIds: [country.metadata.area_id],
      excludedAreaIds: [excludedArea.metadata.area_id, area.metadata.area_id],
      displayName: task.name,
      website: `https://www.${task.id}.com`,
      email: `admin@${task.id}.com`,
      donationLink: `https://www.${task.id}.com/donate`,
      instagramLink: `https://www.instagram.com/${task.id}`,
      facebookLink: `https://www.facebook.com/${task.id}`,
      hardwareReportLink: `https://www.${task.id}.com/reporthardware`,
      description: `We are ${task.id}.\nWe are a 503(B) corporation.`
    })
  },

  organization: async ({ organizations, orgData, user }, use) => {
    const org = await organizations.addOrganization(user, OrgType.localClimbingOrganization, orgData)
    await use(org)
    await organizations.deleteFromCacheById(org._id)
  },

  emptyOrg: async ({ task }, use) => {
    await use({
      displayName: `Foes of ${task.id}`
    })
  }
})

describe('Organization', () => {
  it('should successfully create a document when passed valid input', async ({ organizations, orgData, user, country }) => {
    const newOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, orgData)
    const document = { ...orgData }
    expect(newOrg.displayName).toBe(document.displayName)
    expect(newOrg.content?.website).toBe(document.website)
    expect(newOrg.content?.email).toBe(document.email)
    expect(newOrg.content?.donationLink).toBe(document.donationLink)
    expect(newOrg.content?.instagramLink).toBe(document.instagramLink)
    expect(newOrg.content?.facebookLink).toBe(document.facebookLink)
    expect(newOrg.content?.hardwareReportLink).toBe(document.hardwareReportLink)
    expect(newOrg.content?.description).toBe(document.description)
    expect(newOrg.associatedAreaIds.map(muuidToString)).toEqual([muuidToString(country.metadata.area_id)])
    expect(newOrg._change?.operation).toBe('addOrganization')
    expect(newOrg._change?.seq).toBe(0)

    const orgIdSearchRes = await organizations.findOneOrganizationByOrgId(newOrg.orgId)
    expect(orgIdSearchRes._id).toEqual(newOrg._id)
  })

  describe('should retrieve documents based on displayName', () => {
    it('Should be case insensitive', async ({ organization, organizations }) => {
      // Match should be case-insensitive.
      const displayNameSearchCursor = await organizations.findOrganizationsByFilter({
        displayName: {
          match: organization.displayName.toLocaleUpperCase(),
          exactMatch: false
        }
      })
      const displayNameSearchRes = await displayNameSearchCursor.toArray()
      expect(displayNameSearchRes).toHaveLength(1)
      expect(displayNameSearchRes[0]._id).toEqual(organization._id)
    })

    it('Should match against a partial string', async ({ organization, organizations }) => {
      // Match should be case-insensitive.
      const displayNameSearchCursor = await organizations.findOrganizationsByFilter({
        displayName: {
          match: organization.displayName.toLocaleUpperCase().slice(10, 20),
          exactMatch: false
        }
      })
      const displayNameSearchRes = await displayNameSearchCursor.toArray()
      expect(displayNameSearchRes).toHaveLength(1)
      expect(displayNameSearchRes[0]._id).toEqual(organization._id)
    })
  })

  it('should retrieve documents based on associatedAreaIds', async ({ organizations, orgData, user, excludedArea, area }) => {
    const newOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, orgData)
    const document = {
      associatedAreaIds: [excludedArea.metadata.area_id, area.metadata.area_id]
    }
    await organizations.updateOrganization(user, newOrg.orgId, document)
    const areaIdSearchCursor = await organizations.findOrganizationsByFilter({ associatedAreaIds: { includes: [excludedArea.metadata.area_id] } })
    const areaIdSearchRes = await areaIdSearchCursor.toArray()
    expect(areaIdSearchRes).toHaveLength(1)
    expect(areaIdSearchRes[0]._id).toEqual(newOrg._id)
  })

  describe('update', () => {
    it('should succeed on valid input', async ({ organizations, emptyOrg, user, orgData }) => {
      const newOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, emptyOrg)
      const document = { ...orgData }
      const updatedOrg = await organizations.updateOrganization(user, newOrg.orgId, document)

      expect(updatedOrg).toBeDefined()
      assert(updatedOrg != null)

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

    it('should throw when an invalid area is supplied', async ({ orgData, emptyOrg, user, organizations }) => {
      const newOrg = await organizations.addOrganization(user, OrgType.localClimbingOrganization, emptyOrg)
      const document = {
        ...orgData,
        associatedAreaIds: [muuid.v4()]
      }
      await expect(organizations.updateOrganization(user, newOrg.orgId, document))
        .rejects
        .toThrow(/Organization update error. Reason: Associated areas not found: /)
    })
  })
})
