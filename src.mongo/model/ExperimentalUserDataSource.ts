import { MongoDataSource } from 'apollo-datasource-mongodb'
import { ClientSession } from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { v5 as uuidv5, NIL } from 'uuid'

import { getExperimentalUserModel } from '../db/index.js'
import { ExperimentalUserType } from '../db/UserTypes.js'

/**
 * @deprecated
 */
export default class ExperimentalUserDataSource extends MongoDataSource<ExperimentalUserType> {
  experimentUserModel = getExperimentalUserModel()

  /**
   * Create or update a user.
   * @param session transaction
   * @param inputDisplayName
   * @param inputUrl
   * @returns User UUID if successful.  null otherwise.
   */
  async updateUser (session: ClientSession, inputDisplayName: string, inputUrl: string): Promise<MUUID | null> {
    const url: string = inputUrl
    let displayName = inputDisplayName != null ? inputDisplayName.trim().substring(0, 50) : ''
    let uuid: MUUID
    if (url == null || url.trim() === '') {
      if (displayName === '') {
        // displayName and url are both null/empty
        return null
      }
      uuid = muuid.v4()
    } else {
      // generate uuid from inputUrl
      uuid = muuid.from(uuidv5(inputUrl, NIL))
      if (displayName === '') {
        displayName = `u_${uuid.toUUID().toString()}`
      }
    }

    const filter = {
      _id: uuid
    }
    const doc = {
      displayName,
      url
    }
    const rs = await this.experimentUserModel.findOneAndUpdate(filter, doc, { new: true, upsert: true, session }).lean()

    if (rs._id != null) {
      return rs._id
    }
    return null
  }

  static instance: ExperimentalUserDataSource

  static getInstance (): ExperimentalUserDataSource {
    if (ExperimentalUserDataSource.instance == null) {
      // Why suppress TS error? See: https://github.com/GraphQLGuide/apollo-datasource-mongodb/issues/88
      // @ts-expect-error
      ExperimentalUserDataSource.instance = new ExperimentalUserDataSource({ modelOrCollection: getExperimentalUserModel() })
    }
    return ExperimentalUserDataSource.instance
  }
}
