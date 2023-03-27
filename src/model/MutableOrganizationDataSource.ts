import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { produce } from 'immer'

import { OrganizationType, OperationType, OrgType } from '../db/OrganizationTypes.js'
import OrganizationDataSource from './OrganizationDataSource'
import { changelogDataSource } from './ChangeLogDataSource.js'
import { ChangeRecordMetadataType } from '../db/ChangeLogType.js'

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
      user: user,
      historyId: change._id,
      operation: OperationType.addOrganization,
      seq: 0
    }

    const newOrg = newOrganizationHelper(displayName, orgType)
    newOrg.createdBy = user
    newOrg._change = produce(newChangeMeta, draft => {
      draft.seq = 1
    })

    const rs1 = await this.organizationModel.insertMany(newOrg, { session })
    return rs1[0].toObject()
  }
}

export const newOrganizationHelper = (displayName: string, orgType: OrgType): OrganizationType => {
  const _id = new mongoose.Types.ObjectId()
  const orgId = muuid.v4()
  return {
    _id,
    org_id: orgId,
    displayName,
    orgType,
    associatedAreas: [],
    excludedAreas: [],
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
