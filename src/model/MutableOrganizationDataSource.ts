import mongoose, { ClientSession } from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { produce } from 'immer'

import { OrganizationType, OperationType, OrgType, OrganizationEditableFieldsType } from '../db/OrganizationTypes.js'
import OrganizationDataSource from './OrganizationDataSource.js'
import { changelogDataSource } from './ChangeLogDataSource.js'
import { ChangeRecordMetadataType } from '../db/ChangeLogType.js'
import { sanitize, sanitizeStrict } from '../utils/sanitize.js'
import { muuidToString } from '../utils/helpers.js'
import { getAreaModel } from '../db/AreaSchema.js'

export default class MutableOrganizationDataSource extends OrganizationDataSource {
  /**
   * Add a new organization.
   * @param user
   * @param displayName
   */
  async addOrganization (user: MUUID, displayName: string, orgType: OrgType): Promise<OrganizationType> {
    const session = await this.organizationModel.startSession()
    let ret: OrganizationType
    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addOrganization(session, user, displayName, orgType)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addOrganization (session, user: MUUID, displayName: string, orgType: OrgType): Promise<any> {
    const change = await changelogDataSource.create(session, user, OperationType.addOrganization)
    const newChangeMeta: ChangeRecordMetadataType = {
      user,
      historyId: change._id,
      operation: OperationType.addOrganization,
      seq: 0
    }

    const newOrg = newOrganizationHelper(displayName, orgType)
    newOrg.createdBy = user
    newOrg.updatedBy = user
    newOrg._change = produce(newChangeMeta, draft => {
      draft.seq = 1
    })

    const rs1 = await this.organizationModel.insertMany(newOrg, { session })
    return rs1[0].toObject()
  }

  /**
   * Update one or more organization fields
   *
   * @param user User requesting the update
   * @param orgId Uuid of the organization to be updated
   * @param document New fields
   * @returns Newly updated organization
   */
  async updateOrganization (user: MUUID, orgId: MUUID, document: OrganizationEditableFieldsType): Promise<OrganizationType | null> {
    const _updateOrganization = async (session: ClientSession, user: MUUID, orgId: MUUID, document: OrganizationEditableFieldsType): Promise<any> => {
      const filter = {
        orgId,
        deleting: { $ne: null }
      }

      const org = await this.organizationModel.findOne(filter).session(session)

      if (org == null) {
        throw new Error('Organization update error. Reason: Organization not found.')
      }

      const { associatedAreaIds, excludedAreaIds, displayName, website, email, donationLink, instagramLink, description } = document

      if (associatedAreaIds != null && associatedAreaIds.length > 0) {
        const missingAreaIds = await findNonexistantAreas(associatedAreaIds)
        if (missingAreaIds.length > 0) throw new Error(`Organization update error. Reason: Associated areas not found: ${missingAreaIds.map(m => muuidToString(m)).toString()}`)
        org.set({ associatedAreaIds })
      }
      if (excludedAreaIds != null && excludedAreaIds.length > 0) {
        const missingAreaIds = await findNonexistantAreas(excludedAreaIds)
        if (missingAreaIds.length > 0) throw new Error(`Organization update error. Reason: Excluded areas not found: ${missingAreaIds.map(m => muuidToString(m)).toString()}`)
        org.set({ excludedAreaIds })
      }
      if (displayName != null) { org.set({ displayName: sanitizeStrict(displayName) }) }
      if (website != null) { org.set({ 'content.website': sanitizeStrict(website) }) }
      if (email != null) { org.set({ 'content.email': sanitizeStrict(email) }) }
      if (donationLink != null) { org.set({ 'content.donationLink': sanitizeStrict(donationLink) }) }
      if (instagramLink != null) { org.set({ 'content.instagramLink': sanitizeStrict(instagramLink) }) }
      if (description != null) { org.set({ 'content.description': sanitize(description) }) }

      const opType = OperationType.updateOrganization
      const change = await changelogDataSource.create(session, user, opType)

      const _change: ChangeRecordMetadataType = {
        user,
        historyId: change._id,
        operation: opType,
        seq: 0
      }

      org.set({ _change })
      org.updatedBy = user
      const cursor = await org.save()
      return cursor.toObject()
    }

    const session = await this.organizationModel.startSession()
    let ret: OrganizationType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await _updateOrganization(session, user, orgId, document)
        return ret
      }
    )
    return ret
  }
}

/**
 * Checks which of the input area_ids cannot be found in the Area Mongo collection.
 * @param areaIds Areas to be validated
 */
const findNonexistantAreas = async (areaIds: MUUID[]): Promise<MUUID[]> => {
  const AreaModel = getAreaModel()
  type AreaQueryResp = Array<{ _id: MUUID, metadata: { area_id: MUUID } }>
  const foundAreas: AreaQueryResp = await AreaModel.find(
    { 'metadata.area_id': { $in: areaIds } }
  ).select('metadata.area_id').lean()
  if (foundAreas.length !== areaIds.length) {
    const foundAreaIds = foundAreas.map(fa => fa.metadata.area_id)
    const missingAreaIds = areaIds.filter(a => !foundAreaIds.includes(a))
    return missingAreaIds
  }
  return []
}

export const newOrganizationHelper = (displayName: string, orgType: OrgType): Partial<OrganizationType> => {
  const _id = new mongoose.Types.ObjectId()
  const orgId = muuid.v4()
  return {
    _id,
    orgId,
    displayName,
    orgType,
    associatedAreaIds: [],
    excludedAreaIds: [],
    content: {
      website: '',
      email: '',
      donationLink: '',
      instagramLink: '',
      description: ''
    }
  }
}

export const createInstance = (): MutableOrganizationDataSource => new MutableOrganizationDataSource(mongoose.connection.db.collection('organizations'))
