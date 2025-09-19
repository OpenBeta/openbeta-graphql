import muuid from 'uuid-mongodb'
import { WriteStream, createWriteStream, existsSync, mkdirSync } from 'node:fs'
import {
  point,
  feature,
  featureCollection,
  Feature,
  Point,
  Polygon
} from '@turf/helpers'
import convexHull from '@turf/convex'
import os from 'node:os'

import {
  connectDB,
  gracefulExit,
  getAreaModel,
  getClimbModel,
  getOrganizationModel
} from '../../../index.js'
import { AggregateType } from '../../../AreaTypes.js'
import { logger } from '../../../../logger.js'
import { ClimbType } from '../../../ClimbTypes.js'
import MutableMediaDataSource from '../../../../model/MutableMediaDataSource.js'
import { workingDir } from './init.js'
import { muuidToString } from '../../../../utils/helpers.js'

const MEDIA_PROJECTION = {
  width: 1,
  height: 1,
  mediaUrl: 1,
  format: 1,
  _id: 0,
  'entityTags.targetId': 1,
  'entityTags.ancestors': 1,
  'entityTags.climbName': 1,
  'entityTags.areaName': 1,
  'entityTags.type': 1
}

/**
 * Export leaf areas as Geojson.  Leaf areas are crags/boulders that have climbs.
 */
async function exportLeafCrags (): Promise<void> {
  const model = getAreaModel()

  let features: Array<Feature<Point, { name: string }>> = []

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
      content,
      gradeContext,
      climbs,
      totalClimbs
    } = doc

    const { ancestors } = doc.embeddedRelations
    const ancestorArray = ancestors.map(i => muuidToString(i.uuid))
    const pathTokens = ancestors.map(i => i.name)

    const pointFeature = point(
      doc.metadata.lnglat.coordinates,
      {
        id: metadata.area_id.toUUID().toString(),
        name: areaName,
        type: 'crag',
        content,
        media: await MutableMediaDataSource.getInstance().findMediaByAreaId(
          metadata.area_id,
          MEDIA_PROJECTION,
          true),
        climbs: climbs.map(({ _id, name, type, grades }: ClimbType) => ({
          id: _id.toUUID().toString(),
          name,
          discipline: type,
          grade: grades
        })),
        totalClimbs,
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
 * Export areas as Geojson.  areas are immediate parent of leaf areas (crags/boulders).
 */
async function exportAreas (): Promise<void> {
  logger.info('Exporting areas')
  const stream = createWriteStream(`${workingDir}/areas.geojson`, { encoding: 'utf-8' })

  const model = getAreaModel()

  interface SimpleArea {
    id: string
    areaName: string
    pathTokens: string[]
    ancestors: string[]
    metadata: {
      isDestination: boolean
      polygon: Polygon
      leftRightIndex: number
    }
    media: []
    children: any[]
    totalClimbs: number
    aggregate: AggregateType
  }

  const childAreaProjection = {
    _id: 0,
    id: { $last: { $split: ['$ancestors', ','] } },
    areaName: '$area_name',
    totalClimbs: 1,
    aggregate: 1
  }

  const rs: SimpleArea[] = await model.aggregate([
    { $match: { 'metadata.leaf': false } },
    {
      $lookup: {
        from: 'areas',
        localField: 'children',
        foreignField: '_id',
        as: 'childAreas',
        pipeline: [{
          $project: childAreaProjection
        }, {
          $sort: { 'metadata.leftRightIndex': 1 }
        }]
      }
    },
    {
      $project: {
        _id: 0,
        id: { $last: { $split: ['$ancestors', ','] } },
        areaName: '$area_name',
        content: 1,
        metadata: {
          isDestination: 1,
          polygon: 1,
          leftRightIndex: 1,
          level: { $size: { $split: ['$ancestors', ','] } }
        },
        pathTokens: 1,
        ancestors: { $split: ['$ancestors', ','] },
        children: '$childAreas',
        totalClimbs: 1,
        aggregate: 1
      }
    }
  ])

  const features: Array<
  Feature<
  Polygon
  >
  > = []

  for await (const doc of rs) {
    const polygonFeature = feature(
      doc.metadata.polygon,
      {
        type: 'areas',
        ...doc,
        media: await MutableMediaDataSource.getInstance().findMediaByAreaId(muuid.from(doc.id), MEDIA_PROJECTION, true),
        metadata: doc.metadata
      },
      {
        id: doc.id
      }
    )
    features.push(polygonFeature)
  }

  stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
  stream.close()
}

/**
 * Export Local Climbing Orgs as Geojson (work in progress)
 */
async function exportLCOs (): Promise<void> {
  logger.info('Exporting Local Climbing Orgs')
  const stream = createWriteStream(`${workingDir}/organizations.geojson`, { encoding: 'utf-8' })
  const model = getOrganizationModel()

  const orgProjection = {
    _change: 0,
    _id: 0,
    __v: 0
  }

  const areaProjection = {
    name: '$area_name',
    pathTokens: 1,
    ancestors: 1,
    uuid: '$metadata.area_id',
    polygon: '$metadata.polygon'
  }

  const rs = await model.aggregate([{
    $lookup: {
      from: 'areas',
      localField: 'associatedAreaIds',
      foreignField: 'metadata.area_id',
      as: 'associatedAreas',
      pipeline: [{
        $project: areaProjection
      }]
    }
  }, {
    $lookup: {
      from: 'areas',
      localField: 'excludedAreaIds',
      foreignField: 'metadata.area_id',
      as: 'excludedAreas',
      pipeline: [{
        $project: areaProjection
      }]
    }
  }, {
    $project: orgProjection
  }])

  const features: Array<
  Feature<
  Polygon,
  {
    id: string
    name: string
  }
  >
  > = []

  // for each organization
  for await (const org of rs) {
    const members = org.associatedAreas.map((area: any) => feature(area.polygon))
    const holes = org.excludedAreas.map((area: any) =>
      feature(area.polygon)
    )
    const boundary = convexHull(featureCollection(members.concat(holes)))
    if (boundary != null) {
      features.push(
        feature(boundary.geometry, {
          id: org.orgId.toUUID().toString(),
          name: org.displayName
        })
      )
    }
  }
  stream.write(JSON.stringify(featureCollection(features)) + os.EOL)
  stream.close()
}

/**
 * Create working directory if it does not exist
 */
function prepareWorkingDir (): void {
  if (!existsSync(workingDir)) {
    logger.info(`Working dir doesn't exist.  Creating ${workingDir}`)
    mkdirSync(workingDir, { recursive: true })
  }
}

/**
 * Export crag data as Geojson
 */
async function onDBConnected (): Promise<void> {
  logger.info('Start exporting crag data as Geojson')
  prepareWorkingDir()
  await exportLCOs()
  await exportLeafCrags()
  await exportAreas()
  await gracefulExit()
}

await connectDB(onDBConnected)
