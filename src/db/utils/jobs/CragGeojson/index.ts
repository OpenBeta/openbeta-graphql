import { createWriteStream } from 'node:fs'
import { point, feature, featureCollection, Feature, Point, Polygon } from '@turf/helpers'
import os from 'node:os'
import { MUUID } from 'uuid-mongodb'

import { connectDB, gracefulExit, getAreaModel } from '../../../index.js'
import { logger } from '../../../../logger.js'

/**
 * Export leaf areas as Geojson.  Leaf areas are crags/boulders that have climbs.
 */
async function exportLeafCrags (): Promise<void> {
  const model = getAreaModel()

  const stream = createWriteStream('crags.geojson', { encoding: 'utf-8' })

  const features: Array<Feature<Point, {
    name: string
    id: string
  }>> = []

  for await (const doc of model.find({ 'metadata.leaf': true }).lean()) {
    const { metadata, area_name: areaName, pathTokens, ancestors } = doc

    const ancestorArray = ancestors.split(',')
    const pointFeature = point(doc.metadata.lnglat.coordinates, {
      id: metadata.area_id.toUUID().toString(),
      name: areaName,
      type: 'crag',
      parent: {
        id: ancestorArray[ancestorArray.length - 2],
        name: pathTokens[doc.pathTokens.length - 2]
      }
    })
    features.push(pointFeature)
  }
  stream.write(JSON.stringify(featureCollection(features)))
  stream.close()
}

/**
 * Export crag groups as Geojson.  Crag groups are immediate parent of leaf areas (crags/boulders).
 */
async function exportCragGroups (): Promise<void> {
  const model = getAreaModel()
  const stream = createWriteStream('crag-groups.geojson', { encoding: 'utf-8' })

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
        $and: [
          { parentCrags: { $type: 'array', $ne: [] } }
        ]
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

  const features: Array<Feature<Polygon, {
    name: string
    id: string
  }>> = []

  for await (const doc of rs) {
    const polygonFeature = feature(doc.polygon, {
      type: 'crag-group',
      name: doc.name,
      id: doc.uuid.toUUID().toString(),
      children: doc.childAreaList.map(({ uuid, name, leftRightIndex }) => (
        { id: uuid.toUUID().toString(), name, lr: leftRightIndex }))
    })
    features.push(polygonFeature)
  }

  stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
  stream.close()
}

async function onDBConnected (): Promise<void> {
  logger.info('Start exporting crag data as Geojson')
  await exportLeafCrags()
  await exportCragGroups()
  await gracefulExit()
}

void connectDB(onDBConnected)
