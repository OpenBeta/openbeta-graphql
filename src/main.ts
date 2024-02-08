import { connectDB, defaultPostConnect } from './db/index.js'
import { startServer } from './server.js'

await connectDB(defaultPostConnect)
await startServer()
