import { ChangeStream, MongoClient } from 'mongodb'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { checkVar, defaultPostConnect } from '../db'
import type { TestProject } from 'vitest/node'
import isoCountries, { Alpha3Code } from 'i18n-iso-countries'
import CountriesLngLat from '../data/countries-with-lnglat.json'

/**
 * In-memory Mongo replset used for testing.
 * More portable than requiring user to set up Mongo in a background Docker process.
 * Need a replset to faciliate transactions.
 */
let mongod: MongoMemoryReplSet
let uri: string
let _stream: ChangeStream

// https://vitest.dev/config/
declare module 'vitest' {
  export interface ProvidedContext {
    /** The mongod URI (for tests to connect to) */
    uri: string
  }
}

async function setupSharedCountryQueue (): Promise<void> {
  const availableCountries: Alpha3Code[] = Object.keys(
    isoCountries.getAlpha3Codes()
  ).filter((country) => CountriesLngLat[country]) as Alpha3Code[]

  const client = new MongoClient(uri)
  await client.connect()
  const db = await client.db()
  await db.collection('test_countries').insertMany(
    availableCountries.map(code => ({ code, reserved: false }))
  )
  await client.close()
}

export async function setup (project: TestProject): Promise<void> {
  mongod = await MongoMemoryReplSet.create({
    // Stream listener listens on DB denoted by 'MONGO_DBNAME' env var.
    replSet: { count: 1, storageEngine: 'wiredTiger', dbName: checkVar('MONGO_DBNAME') }
  })

  uri = await mongod.getUri(checkVar('MONGO_DBNAME'))
  await mongoose.connect(uri, { autoIndex: false })
  // Set to 'true' to enable verbose mode
  mongoose.set('debug', false)
  _stream = await defaultPostConnect()
  _stream.on('change', (doc) => {
    // Dummy consumer to make sure doc changes get offloaded
  })

  await setupSharedCountryQueue()
  project.provide('uri', uri)

  // Vitest, like most modern test environments, supports a means by which we can re-create
  // an empty database context every time a file changes and the tests begin their rerun.
  project.onTestsRerun(async () => {
    const client = new MongoClient(uri)
    try {
      await client.connect()
      await client.db().dropDatabase()
      await setupSharedCountryQueue()
    } finally {
      await client.close()
    }
  })
}

export async function teardown (): Promise<void> {
  await mongoose.disconnect()
  await mongoose.connection.close(true)
  await _stream.close()
  await mongod.stop()
}
