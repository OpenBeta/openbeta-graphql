import Typesense from 'Typesense'
import { connectDB, gracefulExit, createAreaModel } from '../../index.js'
import { flattenDisciplines } from './Utils.js'
const chunkSize = 5000

const schema = {
  name: 'climbs',
  num_documents: 0,
  fields: [
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
      name: 'typeSport',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeTrad',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeBouldering',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeAlpine',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeMixed',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeAid',
      type: 'bool' as const,
      facet: true
    },
    {
      name: 'typeTR',
      type: 'bool' as const,
      facet: true
    }
  ]
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
    // do nothing
  }

  try {
    await typesense.collections().create(schema)
  } catch (error) {
    console.log(error)
  }

  const areaModel = createAreaModel()
  const agg = areaModel.aggregate([{ $match: { 'metadata.leaf': true } }]).unwind('climbs').replaceRoot('climbs')

  let count: number = 0
  let chunks: any[] = []

  for await (const doc of agg) {
    if (chunks.length < chunkSize) {
      doc.id = doc._id.toString()
      chunks.push({
        climb_name: doc.name,
        climb_desc: doc.description ?? '',
        fa: doc.fa ?? '',
        ...flattenDisciplines(doc.type)
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
    await typesense.collections('climbs').documents().import(chunks)
    // await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
  }

  console.log('Record uploaded: ', count)
  gracefulExit()
}

connectDB(onDBConnected)
