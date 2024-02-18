import { WriteStream, createWriteStream } from 'node:fs'
import {
  point,
  feature,
  featureCollection,
  Feature,
  Point,
  Polygon
} from '@turf/helpers'
import os from 'node:os'
import { MUUID } from 'uuid-mongodb'

import {
  connectDB,
  gracefulExit,
  getAreaModel,
  getClimbModel
} from '../../../index.js'
import { logger } from '../../../../logger.js'
import { ClimbType } from '../../../ClimbTypes.js'
import MutableMediaDataSource from '../../../../model/MutableMediaDataSource.js'
import { workingDir } from './init.js'

/**
 * Export leaf areas as Geojson.  Leaf areas are crags/boulders that have climbs.
 */
async function exportLeafCrags (): Promise<void> {
  const model = getAreaModel()

  let features: Array<
  Feature<
  Point,
  {
    name: string
  }
  >
  > = []

  let fileIndex = 0
  let stream: WriteStream = createWriteStream(`${workingDir}/crags.${fileIndex}.geojson`, {
    encoding: 'utf-8'
  })
  const cursor = model
    .find({ 'metadata.leaf': true, 'metadata.lnglat': { $ne: null } })
    .populate<{ climbs: ClimbType[] }>({
    path: 'climbs',
    model: getClimbModel()
  })
    .batchSize(10)
    .allowDiskUse(true)
    .lean()

  for await (const doc of cursor) {
    if (doc.metadata.lnglat == null) {
      continue
    }

    const {
      metadata,
      area_name: areaName,
      pathTokens,
      ancestors,
      content,
      gradeContext,
      climbs
    } = doc

    const ancestorArray = ancestors.split(',')
    const pointFeature = point(
      doc.metadata.lnglat.coordinates,
      {
        id: metadata.area_id.toUUID().toString(),
        name: areaName,
        type: 'crag',
        content,
        media: await MutableMediaDataSource.getInstance().findMediaByAreaId(
          metadata.area_id,
          ancestors
        ),
        climbs: climbs.map(({ _id, name, type, grades }: ClimbType) => ({
          id: _id.toUUID().toString(),
          name,
          discipline: type,
          grade: grades
        })),
        ancestors: ancestorArray,
        pathTokens,
        gradeContext
      },
      {
        id: metadata.area_id.toUUID().toString()
      }
    )
    features.push(pointFeature)

    if (features.length === 5000) {
      logger.info(`Writing file ${fileIndex}`)
      stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
      stream.close()
      features = []

      fileIndex++
      stream = createWriteStream(`${workingDir}/crags.${fileIndex}.geojson`, {
        encoding: 'utf-8'
      })
    }
  }

  if (features.length > 0) {
    logger.info(`Writing file ${fileIndex}`)
    stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
  }
  stream.close()
  logger.info('Complete.')
}

/**
 * Export crag groups as Geojson.  Crag groups are immediate parent of leaf areas (crags/boulders).
 */
async function exportCragGroups (): Promise<void> {
  logger.info('Exporting crag groups')
  const stream = createWriteStream(`${workingDir}/crag-groups.geojson`, { encoding: 'utf-8' })

  const model = getAreaModel()

  interface CragGroup {
    uuid: MUUID
    name: string
    polygon: Polygon
    childAreaList: Array<{
      name: string
      uuid: MUUID
      leftRightIndex: number
    }>
  }

  const rs: CragGroup[] = await model.aggregate([
    { $match: { 'metadata.leaf': true } },
    {
      $lookup: {
        from: 'areas',
        localField: '_id',
        foreignField: 'children',
        as: 'parentCrags'
      }
    },
    {
      $match: {
        $and: [{ parentCrags: { $type: 'array', $ne: [] } }]
      }
    },
    {
      $unwind: '$parentCrags'
    },
    {
      $addFields: {
        parentCrags: {
          childId: '$metadata.area_id'
        }
      }
    },
    {
      $group: {
        _id: {
          uuid: '$parentCrags.metadata.area_id',
          name: '$parentCrags.area_name',
          polygon: '$parentCrags.metadata.polygon'
        },
        childAreaList: {
          $push: {
            leftRightIndex: '$metadata.leftRightIndex',
            uuid: '$metadata.area_id',
            name: '$area_name'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        uuid: '$_id.uuid',
        name: '$_id.name',
        polygon: '$_id.polygon',
        childAreaList: 1
      }
    }
  ])

  const features: Array<
  Feature<
  Polygon,
  {
    name: string
  }
  >
  > = []

  for await (const doc of rs) {
    const polygonFeature = feature(
      doc.polygon,
      {
        type: 'crag-group',
        id: doc.uuid.toUUID().toString(),
        name: doc.name,
        children: doc.childAreaList.map(({ uuid, name, leftRightIndex }) => ({
          id: uuid.toUUID().toString(),
          name,
          lr: leftRightIndex
        }))
      },
      {
        id: doc.uuid.toUUID().toString()
      }
    )
    features.push(polygonFeature)
  }

  stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
  stream.close()
}

async function onDBConnected (): Promise<void> {
  logger.info('Start exporting crag data as Geojson')
  // await exportLeafCrags()
  await exportCragGroups()
  await gracefulExit()
}

await connectDB(onDBConnected)
