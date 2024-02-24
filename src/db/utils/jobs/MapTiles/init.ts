import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const workingDir = process.env.MAPTILES_WORKING_DIR ?? ''

if (workingDir.trim() === '') {
  throw new Error('MAPTILES_WORKING_DIR not set')
}

export { workingDir }
