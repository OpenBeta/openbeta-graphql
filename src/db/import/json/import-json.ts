import { Point } from '@turf/helpers'
import mongoose from 'mongoose'
import { MUUID } from 'uuid-mongodb'
import { logger } from '../../../logger.js'
import MutableAreaDataSource from '../../../model/MutableAreaDataSource.js'
import MutableClimbDataSource from '../../../model/MutableClimbDataSource.js'
import { AreaType } from '../../AreaTypes.js'
import { ClimbChangeInputType, ClimbType } from '../../ClimbTypes.js'

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
  addedAreas: AreaType[]
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
  let result: BulkImportResult = {
    addedAreas: [],
    climbIds: [],
    errors: []
  }
  logger.debug('starting bulk import session...')
  const session = _session ?? (await mongoose.startSession())
  try {
    await session.withTransaction(async () => {
      logger.info('starting bulk import...', json)
      result = await _bulkImportJson({ user, json, areas, climbs, session })
      logger.info('bulk import successful', result)
      return result
    })
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
  const addedAreas: AreaType[] = []
  const climbIds: string[] = []

  const addArea = async (
    node: AreaJson,
    parentUuid?: MUUID
  ): Promise<AreaType[]> => {
    const result: AreaType[] = []
    let area: AreaType
    if (node.id !== undefined && node.id !== null) {
      area = (await areas.updateArea(user, node.id, node, session)) as AreaType
    } else if (node.areaName !== undefined) {
      area = await areas.addAreaWith({
        user,
        areaName: node.areaName,
        countryCode: node.countryCode,
        parentUuid,
        session
      })
    } else {
      throw new Error('areaName or id is required')
    }
    result.push(area)
    if (node.children != null) {
      for (const child of node.children) {
        result.push(...(await addArea(child, area.metadata.area_id)))
      }
    }
    if (node.climbs != null) {
      climbIds.push(
        ...(await climbs.addOrUpdateClimbsWith({
          userId: user,
          parentId: area.metadata.area_id,
          changes: [...node.climbs],
          session
        }))
      )
    }
    return [...result]
  }

  for (const node of json?.areas ?? []) {
    // fails fast and throws errors up the chain
    addedAreas.push(...(await addArea(node)))
  }

  return {
    addedAreas: [...addedAreas],
    climbIds,
    errors: []
  }
}
