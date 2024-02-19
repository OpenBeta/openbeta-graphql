import { config } from 'dotenv'

config({ path: ['.env.local', '.env'] })

const mapboxUsername = process.env.MAPBOX_USERNAME ?? ''
const mapboxToken = process.env.MAPBOX_TOKEN ?? ''
const workingDir = process.env.MAPTILES_WORKING_DIR ?? ''

if (mapboxUsername.trim() === '') {
  throw new Error('MAPBOX_USERNAME not set')
}

if (mapboxToken.trim() === '') {
  throw new Error('MAPBOX_TOKEN not set')
}

if (workingDir.trim() === '') {
  throw new Error('MAPTILES_WORKING_DIR not set')
}

export { mapboxUsername, mapboxToken, workingDir }
