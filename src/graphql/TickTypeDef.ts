import { gql } from 'apollo-server'

export const typeDef = gql`
    type Query {
        ticks(user: ID): [TickType]
    }

    type Mutation {
        addTick(input: Tick): TickType
    }

    type TickType {
        _id: ID
        user: ID
        name: String
        notes: String
        uuid: String
        style: String
        attemptType: String
        dateClimbed: String
        grade: String
    }

    input Tick{
        name: String
        notes: String
        uuid: String
        style: String
        attemptType: String
        dateClimbed: String
        grade: String
    }

    
`