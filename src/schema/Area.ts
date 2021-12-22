import { gql } from "apollo-server";

export const typeDef = gql`
  type Query {
    area(ID: Int!): Area
    areas: [Area]
  }

  type Area {
    area_name: String!
    metadata: AreaMetadata!
  }

  type AreaMetadata {
    lat: Float
    lng: Float
    left_right_index: Int
    mp_id: String
    area_id: String!
  }
`;
