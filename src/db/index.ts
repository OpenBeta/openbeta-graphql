import mongoose from 'mongoose'
import { createAreaModel } from './AreaSchema.js'
import { createClimbModel } from './ClimbSchema.js'

import { config } from 'dotenv'

config()

const checkVar = (name: string): string => {
  const value = process.env[name] ?? ''
  if (value === '') {
    console.log('Missing env ', name)
    process.exit(1)
  }
  return value
}

const connectDB = async (): Promise<mongoose.Connection> => {
  const user = checkVar('MONGO_INITDB_ROOT_USERNAME')
  const pass = checkVar('MONGO_INITDB_ROOT_PASSWORD')
  const server = checkVar('MONGO_SERVICE')

  console.log(
    `Connecting to database 'mongodb://${user}:****@${server}'...`
  )
  try {
    /* eslint-disable @typescript-eslint/no-floating-promises */
    mongoose.connect(
    `mongodb://${user}:${pass}@${server}:27017/opentacos?authSource=admin`
    )

    mongoose.connection.on('open', function () {
      console.log('DB connected successfully')
    })

    mongoose.connection.on(
      'error',
      console.error.bind(console, 'MongoDB connection error:')
    )
  } catch (e) {
    console.error("Can't connect to db")
    process.exit(1)
  }
  return mongoose.connection
}

export { connectDB, createAreaModel, createClimbModel }
