import Typesense from 'typesense'
import { connectDB, gracefulExit, createAreaModel } from '../../index.js'
import { disciplinesToArray } from './Utils.js'
const chunkSize = 5000

const schema = {
  name: 'climbs',
  num_documents: 0,
  fields: [
    {
      name: 'climbId',
      type: 'string' as const,
      index: false,
      optional: true
    },
    {
      name: 'climb_name',
      type: 'string' as const,
      facet: false
    },
    {
      name: 'climb_desc',
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
    }
  ]
  // TBD: need to have better tie-breakers (star/popularity ratings)
  //   default_sorting_field: 'climb_name'
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

  const areaModel = createAreaModel()
  const agg = areaModel.aggregate([{ $match: { 'metadata.leaf': true } }, { $unwind: '$climbs' }, { $addFields: { 'climbs.pathTokens': '$pathTokens' } }]).replaceRoot('climbs')

  let count: number = 0
  let chunks: any[] = []

  for await (const doc of agg) {
    if (chunks.length < chunkSize) {
      doc.id = doc._id.toString()
      chunks.push({
        climbId: doc.id,
        climb_name: doc.name,
        climb_desc: doc.content.description ?? '',
        fa: doc.fa ?? '',
        areaNames: doc.pathTokens,
        disciplines: disciplinesToArray(doc.type)
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

connectDB(onDBConnected)
