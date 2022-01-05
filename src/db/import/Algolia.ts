import algoliasearch from 'algoliasearch'
import { connectDB, gracefulExit, createClimbModel } from '../index.js'

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

  await index.setSettings({
    searchableAttributes: [
      'name',
      'unordered(fa)',
      'unordered(content.description)'
    ]
  })

  const climbs = createClimbModel('climbs')
  let chunks: any[] = []
  const cursor = climbs.find({}).cursor()
  let count: number = 0
  await cursor.eachAsync(async (doc) => {
    if (chunks.length < chunkSize) {
      doc.set('objectID', doc.get('metadata.climb_id'))
      chunks.push(doc)
    } else {
      console.log('Pushing batch...')
      count = count + chunkSize
      await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
      chunks = []
    }
  })
  if (chunks.length > 0) {
    // push remaining
    count = count + chunks.length
    await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
  }
  console.log('Record uploaded: ', count)
  gracefulExit()
}

connectDB(onDBConnected)
