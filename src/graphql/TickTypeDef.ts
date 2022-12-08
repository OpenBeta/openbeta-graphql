import { gql } from 'apollo-server'

export const typeDef = gql`
    type Query {
        """Gets all of the users current ticks by their Auth-0 userId"""
        userTicks(userId: String): [TickType!]
        """Gets all of the users current ticks for a specific climb by their 
        Auth-0 userId and Open-Beta ClimbId"""
        userTicksByClimbId(userId: String, climbId: String): [TickType!]

        """
        Get recently created ticks, using simple limit and pagination.
        Limit may be between 0 and 100, and page may scroll 0 through 100.
        As a result, this is not an appropriate query for a large number of ticks
        (at this time - you could refactor the code to extend or improve these limits)
        """
        recentTicks(limit: Int, page: Int): [TickType!]
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
        deleteTick(_id: ID): DeleteSingleTickResult
        """Deletes all ticks created by a user by the userId, 
        mainly a dev feature for while we are working on getting the schema correct
        """
        deleteAllTicks(userId: String): DeleteAllTickResult
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
        _id: ID!
        userId: String!
        name: String!
        climbId: String!
        attemptType: String
        dateClimbed: String!
        dateAdded: Date!
        grade: String!
        source: String!
        dateUpdated: Date
        notes: String
        style: String
    }
    """This is our tick type input, containing the name,
     notes climbId, etc of the ticked climb, all fields are required

     NOTE: source must either be MP or OB which stand for Mountain Project, or Open Beta respectively
     """
    input Tick{
        name: String!
        notes: String
        climbId: String!
        style: String
        attemptType: String
        dateClimbed: String!
        grade: String!
        source: String!
    }

    """Takes in the MongoId and a tick object to replace the old tick object with"""
    input TickFilter{
        _id: String
        updatedTick: Tick
    }

    type DeleteSingleTickResult {
        _id: ID!
        removed: Boolean!
      }

    type DeleteAllTickResult {
        removed: Boolean!
        deletedCount: Int
      }
`
