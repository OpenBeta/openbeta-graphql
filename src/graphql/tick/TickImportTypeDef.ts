import { gql } from 'graphql-tag'

const TickImportTypeDefs = gql`
    type TickImport{
        uuid: [TickType]
    }
`

export default TickImportTypeDefs
