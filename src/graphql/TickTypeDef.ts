import { gql } from 'apollo-server'

export const typeDef = gql`
    type Query {
        """Gets all of the users current ticks by their Auth-0 userId"""
        userTicks(userId: String): [TickType]
        """Gets all of the users current ticks for a specific climb by their 
        Auth-0 userId and Open-Beta ClimbId"""
        userTicksByClimbId(userId: String, climbId: String): [TickType]
    }

    type Mutation {
        """Adds a tick to the MongoDB

        NOTE: climbId is created from the hash function on the backend, input the MP id into the function to create it, or just search for the climb on open beta

        NOTE: source is either MP or OB, which stand for Mountain project and open beta respectively the database will reject anything else. This allows us to determine where the tick was created 

        A tick has the following structure:

            name: String
            notes: String
            climbId: String -- see above Note
            style: String
            attemptType: String
            dateClimbed: String
            grade: String
            source: String -- see above Note
        """
        addTick(input: Tick): TickType
        """Deletes a tick from MongoDB by the _id property created in the database"""
        deleteTick(input: MongoId): String
        """Deletes all ticks created by a user by the userId, 
        mainly a dev feature for while we are working on getting the schema correct
        """
        deleteAllTicks(input: UserId): String
        """Imports a users ticks from mountain project, this feature also deletes all ticks previously imported from mountain project
         before importing them, allowing users to constantly update their ticks without creating duplicates
         """
        importTicks(input: [Tick]): [TickType]
        editTick(input: TickFilter) : TickType
    }
    """This is our tick type, containing the name, notes climbId,
     etc of the ticked climb NOTE: source must either be MP or OB
     which stand for Mountain Project, or Open Beta respectively
     """
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
        source: String
    }
    """This is our tick type input, containing the name,
     notes climbId, etc of the ticked climb, all fields are required

     NOTE: source must either be MP or OB which stand for Mountain Project, or Open Beta respectively
     """
    input Tick{
        name: String!
        notes: String!
        climbId: String!
        userId: String!
        style: String!
        attemptType: String!
        dateClimbed: String!
        grade: String!
        source: String!
    }

    """Takes in the MongoId and a tick object to replace the old tick object with"""
    input TickFilter{
        _id: String
        updatedTick: Tick
    }

    """This is the userId provided by Auth-0"""
    input UserId{
        userId: String
    }


    """This is the _id provided by MongoDB upon creation"""
    input MongoId{
        _id: String
    }
`
