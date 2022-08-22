import { gql } from 'apollo-server'

export const typeDef = gql`
    type Query {
        ticks(user: ID): [TickType]
    }

    type Mutation {
        addTick(input: Tick): TickType
        deleteTick(input: String): String
        importTicks(input: [Tick]): [TickType]
        editTick(input: TickFilter) : TickType
    }

    type TickType {
        _id: ID
        userId: String
        name: String
        notes: String
        climbId: String
        style: String
        attemptType: String
        dateClimbed: String
        grade: String
    }

    input Tick{
        name: String
        notes: String
        climbId: String
        userId: String
        style: String
        attemptType: String
        dateClimbed: String
        grade: String
    }

    input TickFilter{
        _id: String
        updatedTick: Tick
    }
`
