import Typesense from 'typesense'
import { Point } from '@turf/helpers'

import { connectDB, gracefulExit, getClimbModel } from '../../index.js'
import { disciplinesToArray } from './Utils.js'
import { ClimbExtType } from '../../ClimbTypes.js'

const chunkSize = 5000

const schema = {
  name: 'climbs',
  num_documents: 0,
  fields: [
    {
      name: 'climbName',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'climbDesc',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'fa',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'disciplines',
      type: 'string[]' as const,
      facet: true
    },
    {
      name: 'areaNames',
      type: 'string[]' as const,
      facet: false
    },
    {
      name: 'climbUUID',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'grade',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'safety',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'cragLatLng',
      type: 'geopoint' as const,
      index: true
    }
  ]
  // TBD: need to have better tie-breakers (star/popularity ratings)
  // default_sorting_field: 'climb_name'
}

const onDBConnected = async (): Promise<void> => {
  const node = process.env.TYPESENSE_NODE ?? ''
  const apiKey = process.env.TYPESENSE_API_KEY ?? ''

  if (node === '' || apiKey === '') {
    gracefulExit(1)
  }

  console.log('Start pushing data to TypeSense')

  const typesense = new Typesense.Client({
    nodes: [
      {
        host: node,
        port: 443,
        protocol: 'https'
      }
    ],
    apiKey,
    numRetries: 3, // A total of 4 tries (1 original try + 3 retries)
    connectionTimeoutSeconds: 120, // Set a longer timeout for large imports
    logLevel: 'info'
  })

  try {
    // Delete if the collection already exists from a previous example run
    await typesense.collections('climbs').delete()
  } catch (error) {
    console.log(error)
  }

  try {
    await typesense.collections().create(schema)
  } catch (error) {
    console.log(error)
    gracefulExit()
  }

  /**
   * SQL equivalent:
   *
   * `SELECT climbs.*, areas.ancestors, areas.pathTokens
   * FROM climbs, areas
   * WHERE climbs.metadata.areaRef = areas.metadata.area_id'`
   */
  const allClimbs = await getClimbModel()
    .aggregate<ClimbExtType>([
    {
      $lookup: {
        from: 'areas', // other collection name
        localField: 'metadata.areaRef',
        foreignField: 'metadata.area_id',
        as: 'area', // clobber array of climb IDs with climb objects
        pipeline: [
          {
            $project: { // only include specific fields
              _id: 0,
              ancestors: 1,
              pathTokens: 1
            }
          }
        ]
      }
    },
    { $unwind: '$area' }, // Previous stage returns as an array of 1 element. 'unwind' turn it into an object.
    {
      $replaceWith: { // Merge area.* with top-level object
        $mergeObjects: ['$$ROOT', '$area']
      }
    }
  ])

  let count: number = 0
  let chunks: any[] = []

  for await (const doc of allClimbs) {
    if (chunks.length < chunkSize) {
      chunks.push({
        climbUUID: doc.metadata.climb_id.toUUID().toString(),
        climbName: doc.name,
        climbDesc: doc.content.description ?? '',
        fa: doc.fa ?? '',
        areaNames: doc.pathTokens,
        disciplines: disciplinesToArray(doc.type),
        grade: doc.yds,
        safety: doc.safety,
        cragLatLng: geoToLatLng(doc.metadata.lnglat)
      })
    } else {
      count = count + chunkSize
      console.time(`Pushing batch: ${count / chunkSize}`)
      try {
        await typesense.collections('climbs').documents().import(chunks)
      } catch (e) {
        console.log(e)
      }
      console.timeEnd(`Pushing batch: ${count / chunkSize}`)
      chunks = []
    }
  }

  if (chunks.length > 0) {
    // push remaining
    count = count + chunks.length
    try {
      await typesense.collections('climbs').documents().import(chunks)
    } catch (e) {
      console.log(e)
    }
  }

  console.log('Record uploaded: ', count)
  gracefulExit()
}

/**
 * Convert mongo db geo point type to [lat,lng] for typesense geo search
 * @param geoPoint
 * @returns
 */
const geoToLatLng = (geoPoint: Point): [number, number] => {
  const { coordinates } = geoPoint
  return [coordinates[1], coordinates[0]]
}

connectDB(onDBConnected)
