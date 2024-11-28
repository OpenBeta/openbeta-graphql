import { connectDB, defaultPostConnect } from './db/index.js'
import { createServer } from './server.js'

await connectDB(defaultPostConnect)
await createServer()
