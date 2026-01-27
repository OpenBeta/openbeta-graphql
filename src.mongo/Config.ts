import { config } from 'dotenv'

config({ path: '.env.local' })
config() // initialize dotenv

const checkAndPrintWarning = (name: string, value?: string): string => {
  if (value == null) {
    throw new Error(`## Error: '${name}' not defined ##`)
  }
  return value
}

type DeploymentType = 'production' | 'staging'
interface ConfigType {
  DEPLOYMENT_ENV: DeploymentType
  TYPESENSE_NODE: string
  TYPESENSE_API_KEY_RW: string
}
// Todo: add other props in .env
const Config: ConfigType = {
  DEPLOYMENT_ENV: checkAndPrintWarning('DEPLOYMENT_ENV', process.env.DEPLOYMENT_ENV) as DeploymentType,
  TYPESENSE_NODE: checkAndPrintWarning('TYPESENSE_NODE', process.env.TYPESENSE_NODE),
  TYPESENSE_API_KEY_RW: checkAndPrintWarning('TYPESENSE_API_KEY_RW', process.env.TYPESENSE_API_KEY_RW)
}

export default Config
