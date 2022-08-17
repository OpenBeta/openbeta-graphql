import { gql } from 'apollo-server'

const TickImportTypeDefs = gql`
    type TickImport{
        uuid: [TickType]
    }
`


export default TickImportTypeDefs