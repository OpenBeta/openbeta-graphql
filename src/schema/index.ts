import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDef as Climb } from "./Climb";
import { typeDef as Area } from "./Area";

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      console.log(ID);
      return dataSources.climbs.findOneById(ID);
    },

    areas: async (parent, args, { dataSources: {areas} }) => {
      return await areas.all();
    },

    area: async (parent, { ID }, { dataSources:{areas} }) => {
      console.log(ID);
      //console.log(dataSources.climb.)
      return areas.findOneById(ID);
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers,
});
