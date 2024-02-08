import {connectDB, defaultPostConnect} from './db/index.js'
import {createServer, startServer} from './server.js'

await connectDB(defaultPostConnect)
await startServer(await createServer())
