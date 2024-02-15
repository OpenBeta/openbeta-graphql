import { gql } from 'apollo-server-express'

const TickImportTypeDefs = gql`
    type TickImport{
        uuid: [TickType]
    }
`

export default TickImportTypeDefs
