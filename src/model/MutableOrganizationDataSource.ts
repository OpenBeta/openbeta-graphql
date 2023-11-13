import mongoose, { ClientSession } from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { produce } from 'immer'

import { OrganizationType, OperationType, OrgType, OrganizationEditableFieldsType } from '../db/OrganizationTypes'
import OrganizationDataSource from './OrganizationDataSource'
import { changelogDataSource } from './ChangeLogDataSource'
import { ChangeRecordMetadataType } from '../db/ChangeLogType'
import { sanitize, sanitizeStrict } from '../utils/sanitize'
import { muuidToString } from '../utils/helpers'
import { getAreaModel } from '../db/AreaSchema'

export default class MutableOrganizationDataSource extends OrganizationDataSource {
  /**
   * Add a new organization.
   * @param user
   * @param orgType
   * @param document New fields
   */
  async addOrganization (user: MUUID, orgType: OrgType, document: OrganizationEditableFieldsType): Promise<OrganizationType> {
    const session = await this.organizationModel.startSession()
    let ret: OrganizationType
    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async (session) => {
        ret = await this._addOrganization(session, user, orgType, document)
        return ret
      })
    // @ts-expect-error
    return ret
  }

  async _addOrganization (session, user: MUUID, orgType: OrgType, document: OrganizationEditableFieldsType): Promise<any> {
    const change = await changelogDataSource.create(session, user, OperationType.addOrganization)
    const newChangeMeta: ChangeRecordMetadataType = {
      user,
      historyId: change._id,
      operation: OperationType.addOrganization,
      seq: 0
    }

    if (document.displayName == null) throw new Error('`displayName` is a mandatory field.')
    const newOrg = await sanitizeEditableFields(document)
    newOrg._id = new mongoose.Types.ObjectId()
    newOrg.orgId = muuid.v4()
    newOrg.orgType = orgType
    newOrg.createdBy = user
    newOrg.updatedBy = user
    newOrg._change = produce(newChangeMeta, draft => {
      draft.seq = 0
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
    const session = await this.organizationModel.startSession()
    let ret: OrganizationType | null = null

    // withTransaction() doesn't return the callback result
    // see https://jira.mongodb.org/browse/NODE-2014
    await session.withTransaction(
      async session => {
        ret = await this._updateOrganization(session, user, orgId, document)
        return ret
      }
    )
    return ret
  }

  async _updateOrganization (session: ClientSession, user: MUUID, orgId: MUUID, document: OrganizationEditableFieldsType): Promise<any> {
    const filter = {
      orgId,
      deleting: { $ne: null }
    }

    const org = await this.organizationModel.findOne(filter).session(session)

    if (org == null) {
      throw new Error('Organization update error. Reason: Organization not found.')
    }

    const orgFragment = await sanitizeEditableFields(document)
    const opType = OperationType.updateOrganization
    const change = await changelogDataSource.create(session, user, opType)

    const _change: ChangeRecordMetadataType = {
      user,
      historyId: change._id,
      operation: opType,
      seq: 0
    }

    orgFragment._change = _change
    orgFragment.updatedBy = user

    org.set(orgFragment)
    const cursor = await org.save()
    return cursor.toObject()
  }

  static instance: MutableOrganizationDataSource

  static getInstance (): MutableOrganizationDataSource {
    if (MutableOrganizationDataSource.instance == null) {
      MutableOrganizationDataSource.instance = new MutableOrganizationDataSource(mongoose.connection.db.collection('organizations'))
    }
    return MutableOrganizationDataSource.instance
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

/*
 * Unpacks input, sanitizes it and returns organization fragment.
 * Only handles editable fields -- immutable ones validated separately.
 */
const sanitizeEditableFields = async (
  document: OrganizationEditableFieldsType
): Promise<Partial<OrganizationType>> => {
  const { associatedAreaIds, excludedAreaIds, displayName, website, email, donationLink, instagramLink, facebookLink, hardwareReportLink, description } = document
  const orgFragment: Partial<OrganizationType> = {}

  if (associatedAreaIds !== undefined && associatedAreaIds.length > 0) {
    const missingAreaIds = await findNonexistantAreas(associatedAreaIds)
    if (missingAreaIds.length > 0) throw new Error(`Organization update error. Reason: Associated areas not found: ${missingAreaIds.map(m => muuidToString(m)).toString()}`)
    orgFragment.associatedAreaIds = associatedAreaIds
  }
  if (excludedAreaIds !== undefined && excludedAreaIds.length > 0) {
    const missingAreaIds = await findNonexistantAreas(excludedAreaIds)
    if (missingAreaIds.length > 0) throw new Error(`Organization update error. Reason: Excluded areas not found: ${missingAreaIds.map(m => muuidToString(m)).toString()}`)
    orgFragment.excludedAreaIds = excludedAreaIds
  }
  if (displayName !== undefined) { orgFragment.displayName = sanitizeStrict(displayName) }
  if (website !== undefined) { orgFragment['content.website'] = sanitizeStrict(website) }
  if (email !== undefined) { orgFragment['content.email'] = sanitizeStrict(email) }
  if (donationLink !== undefined) { orgFragment['content.donationLink'] = sanitizeStrict(donationLink) }
  if (instagramLink !== undefined) { orgFragment['content.instagramLink'] = sanitizeStrict(instagramLink) }
  if (facebookLink !== undefined) { orgFragment['content.facebookLink'] = sanitizeStrict(facebookLink) }
  if (hardwareReportLink !== undefined) { orgFragment['content.hardwareReportLink'] = sanitizeStrict(hardwareReportLink) }
  if (description !== undefined) { orgFragment['content.description'] = sanitize(description) }

  return orgFragment
}
