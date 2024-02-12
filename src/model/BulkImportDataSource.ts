import MutableAreaDataSource from './MutableAreaDataSource.js'
import mongoose, { ClientSession } from 'mongoose'
import { withTransaction } from '../utils/helpers.js'
import muuid, { MUUID } from 'uuid-mongodb'
import { AreaType } from '../db/AreaTypes.js'
import {
  BulkImportAreaInputType,
  BulkImportClimbInputType,
  BulkImportInputType,
  BulkImportResultType
} from '../db/BulkImportTypes.js'
import MutableClimbDataSource from './MutableClimbDataSource.js'
import { logger } from '../logger.js'
import { ClimbChangeInputType, ClimbType } from '../db/ClimbTypes.js'

export interface BulkImportOptions {
  user: MUUID
  input: BulkImportInputType
  session?: mongoose.ClientSession
  climbs?: MutableClimbDataSource
}

export default class BulkImportDataSource extends MutableAreaDataSource {
  /**
   *
   * @param json the json to import formatted in a valid database format
   * @returns a list of ids of the areas that were imported
   */
  async bulkImport ({
    user,
    input,
    session: _session,
    climbs = MutableClimbDataSource.getInstance()
  }: BulkImportOptions): Promise<BulkImportResultType> {
    const result: BulkImportResultType = {
      addedAreas: [],
      updatedAreas: [],
      addedOrUpdatedClimbs: []
    }
    logger.debug('starting bulk import session...')
    const session = _session ?? (await mongoose.startSession())
    try {
      return await withTransaction(session, async () => {
        logger.info('starting bulk import...', input)
        return await this._bulkImportJson({ user, input, climbs, session })
      }) ?? result
    } catch (e) {
      logger.error('bulk import failed', e)
      throw e
    } finally {
      if (!session.hasEnded) {
        await session.endSession()
      }
    }
  }

  private async _bulkImportJson ({
    user,
    input,
    session,
    climbs = MutableClimbDataSource.getInstance()
  }: BulkImportOptions): Promise<BulkImportResultType> {
    const addOrUpdateArea = async (
      areaNode: BulkImportAreaInputType,
      parentUuid?: MUUID
    ): Promise<BulkImportResultType> => {
      const result: BulkImportResultType = {
        addedAreas: [],
        updatedAreas: [],
        addedOrUpdatedClimbs: []
      }
      let area: AreaType | null
      if (areaNode.uuid !== undefined && areaNode.uuid !== null) {
        area = await this.updateAreaWith({
          user,
          areaUuid: muuid.from(areaNode.uuid),
          document: {
            areaName: areaNode.areaName,
            description: areaNode.description,
            leftRightIndex: areaNode.leftRightIndex,
            lng: areaNode.lng,
            lat: areaNode.lat
          },
          session
        })
        if (area != null) {
          result.updatedAreas.push(area)
        } else {
          throw new Error(`area with id ${areaNode.uuid.toUUID().toString()} (${areaNode.areaName ?? 'unknown name'}) not found`)
        }
      } else if (areaNode.areaName !== undefined) {
        area = await this.addAreaWith({
          user,
          areaName: areaNode.areaName,
          countryCode: areaNode.countryCode,
          parentUuid,
          session
        }).then(async (area) => {
          return await this.updateArea(user, area.metadata.area_id, {
            description: areaNode.description,
            leftRightIndex: areaNode.leftRightIndex,
            lng: areaNode.lng,
            lat: areaNode.lat
          }, session)
        })
        if (area != null) {
          result.addedAreas.push(area)
        } else {
          throw new Error(`failed to add area ${areaNode.areaName} to parent ${parentUuid?.toUUID().toString() ?? 'unknown'}`)
        }
      } else {
        throw new Error('areaName or id is required')
      }
      if (areaNode.children !== undefined) {
        for (const child of areaNode.children) {
          const childResult = await addOrUpdateArea(child, area.metadata.area_id)
          result.updatedAreas.push(...childResult.updatedAreas)
          result.addedAreas.push(...childResult.addedAreas)
          result.addedOrUpdatedClimbs.push(...childResult.addedOrUpdatedClimbs)
        }
      }
      if (areaNode.climbs !== undefined) {
        const addedOrUpdatedClimbs = await Promise.all(await climbs?.addOrUpdateClimbsWith({
          userId: user,
          parentId: area.metadata.area_id,
          changes: [...areaNode.climbs.map(this.toClimbChangeInputType) ?? []],
          session
        }).then((climbIds) => climbIds
          .map((id) => climbs?.climbModel.findById(muuid.from(id)).session(session as ClientSession))) ?? [])
        result.addedOrUpdatedClimbs.push(...addedOrUpdatedClimbs
          .filter((climb) => climb !== null)
          .map((climb) => climb as unknown as ClimbType)
        )
      }
      return result
    }

    const results = await Promise.all<BulkImportResultType>(
      input?.areas.map(async (area) => await addOrUpdateArea(area)) ?? []
    )
    return results.reduce((acc, result) => {
      acc.addedAreas.push(...result.addedAreas)
      acc.updatedAreas.push(...result.updatedAreas)
      acc.addedOrUpdatedClimbs.push(...result.addedOrUpdatedClimbs)
      return acc
    }, {
      addedAreas: [],
      updatedAreas: [],
      addedOrUpdatedClimbs: []
    })
  }

  private toClimbChangeInputType (climb: BulkImportClimbInputType): ClimbChangeInputType {
    return {
      id: climb.uuid?.toUUID().toString(),
      name: climb.name,
      grade: climb.grade,
      disciplines: climb.disciplines,
      leftRightIndex: climb.leftRightIndex,
      description: climb.description,
      location: climb.location,
      protection: climb.protection,
      fa: climb.fa,
      length: climb.length,
      boltsCount: climb.boltsCount,
      experimentalAuthor: climb.experimentalAuthor,
      pitches: climb.pitches?.map((pitch) => ({
        pitchNumber: pitch.pitchNumber,
        grade: pitch.grade,
        disciplines: pitch.disciplines,
        description: pitch.description,
        length: pitch.length,
        boltsCount: pitch.boltsCount
      }))
    }
  }

  static instance: BulkImportDataSource

  static getInstance (): BulkImportDataSource {
    if (BulkImportDataSource.instance == null) {
      BulkImportDataSource.instance = new BulkImportDataSource(mongoose.connection.db.collection('areas'))
    }
    return BulkImportDataSource.instance
  }
}
