import { Point } from '@turf/helpers'
import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
import { logger } from '../../../logger.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import MutableClimbDataSource from '../../../model/MutableClimbDataSource.js'
import { AreaType } from '../../AreaTypes.js'
import { ClimbChangeInputType, ClimbType } from '../../ClimbTypes.js'
import { withTransaction } from '../../../utils/helpers'

export type AreaJson = Partial<
Omit<AreaType, 'metadata' | 'children' | 'climbs'>
> & {
  id?: MUUID
  areaName: string
  countryCode?: string
  metadata?: Partial<Omit<AreaType['metadata'], 'lnglat'>> & {
    lnglat?: [number, number] | Point
  }
  children?: AreaJson[]
  climbs?: ClimbChangeInputType[]
}

export type ClimbJson = Partial<Omit<ClimbType, 'metadata' | 'pitches'>> & {
  metadata?: Omit<ClimbType['metadata'], 'areaRef'>
}

export interface BulkImportOptions {
  user: MUUID
  json: { areas?: AreaJson[] }
  session?: mongoose.ClientSession
  areas?: MutableAreaDataSource
  climbs?: MutableClimbDataSource
}

export interface BulkImportResult {
  addedAreaIds: string[]
  updatedAreaIds: string[]
  climbIds: string[]
  errors: Error[]
}

/**
 *
 * @param json the json to import formatted in a valid database format
 * @returns a list of ids of the areas that were imported
 */
export async function bulkImportJson ({
  user,
  json,
  session: _session,
  areas = MutableAreaDataSource.getInstance(),
  climbs = MutableClimbDataSource.getInstance()
}: BulkImportOptions): Promise<BulkImportResult> {
  const result: BulkImportResult = {
    addedAreaIds: [],
    updatedAreaIds: [],
    climbIds: [],
    errors: []
  }
  logger.debug('starting bulk import session...')
  const session = _session ?? (await mongoose.startSession())
  try {
    return await withTransaction(session, async () => {
      logger.info('starting bulk import...', json)
      return await _bulkImportJson({ user, json, areas, climbs, session })
    }) ?? result
  } catch (e) {
    logger.error('bulk import failed', e)
    result.errors.push(e)
  } finally {
    await session.endSession()
  }
  return result
}

async function _bulkImportJson ({
  user,
  json,
  session,
  areas = MutableAreaDataSource.getInstance(),
  climbs = MutableClimbDataSource.getInstance()
}: BulkImportOptions): Promise<BulkImportResult> {
  const addOrUpdateArea = async (
    node: AreaJson,
    parentUuid?: MUUID
  ): Promise<BulkImportResult> => {
    const result: BulkImportResult = {
      addedAreaIds: [],
      updatedAreaIds: [],
      climbIds: [],
      errors: []
    }
    let area: AreaType | null
    if (node.id !== undefined && node.id !== null) {
      area = await areas?.updateAreaWith({ user, areaUuid: muuid.from(node.id), document: node, session })
      if (area != null) { result.updatedAreaIds.push(area.metadata.area_id.toUUID().toString()) }
    } else if (node.areaName !== undefined) {
      area = await areas.addAreaWith({
        user,
        areaName: node.areaName,
        countryCode: node.countryCode,
        parentUuid,
        session
      })
      result.addedAreaIds.push(area?.metadata.area_id.toUUID().toString())
    } else {
      throw new Error('areaName or id is required')
    }
    if ((node.children != null) && (area != null)) {
      for (const child of node.children) {
        const childResult = await addOrUpdateArea(child, area.metadata.area_id)
        result.updatedAreaIds.push(...childResult.updatedAreaIds)
        result.addedAreaIds.push(...childResult.addedAreaIds)
        result.climbIds.push(...childResult.climbIds)
      }
    }
    if ((node.climbs != null) && (area != null)) {
      const climbIds = await climbs.addOrUpdateClimbsWith({
        userId: user,
        parentId: area.metadata.area_id,
        changes: [...node.climbs ?? []],
        session
      })
      result.climbIds.push(...climbIds)
    }
    return result
  }

  const results = await Promise.all<BulkImportResult>(json?.areas?.map(async (node) => await (addOrUpdateArea(node) ?? {})) ?? [])
  return results.reduce((acc, r) => ({
    addedAreaIds: [...acc.addedAreaIds, ...r.addedAreaIds],
    updatedAreaIds: [...acc.updatedAreaIds, ...r.updatedAreaIds],
    climbIds: [...acc.climbIds, ...r.climbIds],
    errors: [...acc.errors, ...r.errors]
  }), {
    addedAreaIds: [],
    updatedAreaIds: [],
    climbIds: [],
    errors: []
  })
}
