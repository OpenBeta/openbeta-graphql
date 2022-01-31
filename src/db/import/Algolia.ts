import algoliasearch from 'algoliasearch'
import { connectDB, gracefulExit, createAreaModel } from '../index.js'

const chunkSize = 1000

const onDBConnected = async (): Promise<void> => {
  const appID = process.env.ALGOLIA_APP_ID ?? ''
  const apiKey = process.env.ALGOLIA_API_KEY ?? ''

  if (appID === '' || apiKey === '') {
    gracefulExit(1)
  }

  console.log('Start pushing data to Algolia')

  const algoliaClient = algoliasearch(appID, apiKey)
  const index = algoliaClient.initIndex('climbs')

  await index.delete()

  await index.setSettings({
    searchableAttributes: [
      'name',
      'unordered(fa)',
      'unordered(content.description)'
    ]
  })

  const areaModel = createAreaModel()
  const agg = areaModel.aggregate([{ $match: { 'metadata.leaf': true } }]).unwind('climbs').replaceRoot('climbs')

  let count: number = 0
  let chunks: any[] = []

  for await (const doc of agg) {
    if (chunks.length < chunkSize) {
      doc.objectID = doc._id.toString()
      chunks.push(doc)
    } else {
      console.log('Pushing batch...')
      count = count + chunkSize
      try {
        await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
      } catch (e) {
        console.log(e)
      }
      chunks = []
    }
  }

  if (chunks.length > 0) {
    // push remaining
    count = count + chunks.length
    await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
  }

  console.log('Record uploaded: ', count)
  gracefulExit()
}

connectDB(onDBConnected)
