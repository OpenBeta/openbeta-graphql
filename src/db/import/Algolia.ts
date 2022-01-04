import algoliasearch from 'algoliasearch'
import { connectDB, gracefulExit, createClimbModel } from '../index.js'

const onDBConnected = async (): Promise<void> => {
  const algoliaClient = algoliasearch('SNVXWMFA0Y', '2455a0014b7a039dbcef2062c8c93afc')
  const index = algoliaClient.initIndex('climbs')

  const climbs = createClimbModel('climbs')
  let chunks: any[] = []
  const cursor = climbs.find({}).cursor()
  await cursor.eachAsync(async (doc) => {
    if (chunks.length < 1000) {
      chunks.push(doc)
    } else {
      console.log('algoia push')
      await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
      chunks = []
    }
  })
  if (chunks.length > 0) {
    // push remaining
    await index.saveObjects(chunks, { autoGenerateObjectIDIfNotExist: true })
  }
  gracefulExit()
}

connectDB(onDBConnected)
