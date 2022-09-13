import { gql } from 'apollo-server'

export const typeDef = gql`
    type Query {
        userTicks(userId: String): [TickType]
        userTicksByClimbId(userId: String, climbId: String): [TickType]
    }

    type Mutation {
        addTick(input: Tick): TickType
        deleteTick(input: MongoId): String
        deleteAllTicks(input: UserId): String
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

    input UserId{
        userId: String
    }

    input MongoId{
        _id: String
    }
`
