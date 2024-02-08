import { Point, geometry } from '@turf/helpers'
import { AnyBulkWriteOperation, BulkWriteResult } from 'mongodb'
import mongoose from 'mongoose'
import muuid from 'uuid-mongodb'
import { logger } from '../../../logger.js'
import { getAreaModel } from '../../AreaSchema.js'
import { AreaType } from '../../AreaTypes.js'
import { ClimbType } from '../../ClimbTypes.js'

export type AreaJson = Partial<
Omit<AreaType, 'metadata' | 'children' | 'climbs'>
> & {
  id?: string | mongoose.Types.ObjectId
  metadata?: Partial<Omit<AreaType['metadata'], 'lnglat'>> & {
    lnglat?: [number, number] | Point
  }
  children?: AreaJson[]
  climbs?: ClimbJson[]
}

export type ClimbJson = Partial<Omit<ClimbType, 'metadata' | 'pitches'>> & {
  metadata?: Omit<ClimbType['metadata'], 'areaRef'>
}

export async function bulkImportJson (json: AreaJson): Promise<BulkWriteResult> {
  const { operations } = createBulkOperation(json)

  logger.info('Bulk importing the following data...')
  logger.info(JSON.stringify(operations, null, 2))

  const AreaModel = getAreaModel()
  return await AreaModel.bulkWrite(operations)
}

export function createBulkOperation (node: AreaJson): {
  id: mongoose.Types.ObjectId
  operations: AnyBulkWriteOperation[]
} {
  const bulkOperations: AnyBulkWriteOperation[] = []
  const { children = [], ...area } = node
  const { id, operation } = createArea(area)

  const childIds: mongoose.Types.ObjectId[] = []

  for (const child of children) {
    const { id: childId, operations } = createBulkOperation(child)
    bulkOperations.push(...operations)
    childIds.push(childId)
  }

  bulkOperations.push(operation)
  if (childIds.length > 0) {
    bulkOperations.push({
      updateOne: {
        filter: { _id: id },
        update: {
          // @ts-expect-error
          $push: {
            children: {
              $each: childIds
            }
          }
        }
      }
    })
  }

  return { id, operations: bulkOperations }
}

function createArea (
  json: AreaJson,
  parentId?: mongoose.Types.ObjectId | string
): { id: mongoose.Types.ObjectId, operation: AnyBulkWriteOperation } {
  const {
    id: existingId,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    area_name,
    metadata,
    gradeContext,
    content = {},
    climbs = [],
    ...rest
  } = json

  const id = new mongoose.Types.ObjectId(existingId)
  const coords = metadata?.lnglat !== undefined && Array.isArray(metadata.lnglat)
    ? geometry('Point', metadata.lnglat)
    : metadata?.lnglat
  const leaf = metadata?.leaf ?? climbs.length > 0

  return {
    id,
    operation: {
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            area_name,
            gradeContext,
            metadata: {
              ...metadata,
              leaf,
              isBoulder: false,
              lnglat: coords
            },
            content,
            climbs: climbs.map(createClimb),
            ...rest
          }
        },
        upsert: true
      }
    }
  }
}

function createClimb (climb: ClimbJson): ClimbJson {
  const {
    _id: existingId,
    name = 'Unknown Climb',
    type = { sport: true },
    grades = {},
    metadata = {},
    content = {},
    ...rest
  } = climb

  const id = existingId ?? muuid.v4()

  return {
    _id: id,
    name,
    type,
    grades,
    metadata,
    content,
    ...rest
  }
}
