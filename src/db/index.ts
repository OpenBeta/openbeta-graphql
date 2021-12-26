import { connect, Connection, connection } from 'mongoose'
import { createAreaModel } from './AreaSchema'
import { createClimbModel } from './ClimbSchema'

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

const connectDB = async (): Promise<Connection> => {
  const user = checkVar('MONGO_INITDB_ROOT_USERNAME')
  const pass = checkVar('MONGO_INITDB_ROOT_PASSWORD')
  const server = checkVar('MONGO_SERVICE')

  console.log(
    `Connecting to database 'mongodb://${user}:****@${server}'...`
  )

  await connect(
    `mongodb://${user}:${pass}@${server}:27017/opentacos?authSource=admin`
  )

  connection.on('open', function () {
    console.log('DB connected successfully')
  })

  connection.on(
    'error',
    console.error.bind(console, 'MongoDB connection error:')
  )
  return connection
}

export { connectDB, createAreaModel, createClimbModel }
