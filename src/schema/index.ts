import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDef as Climb } from "./Climb";
import { typeDef as Area } from "./Area";

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      console.log(ID);
      //console.log(dataSources.climb.)
      return dataSources.climbs.findOneById(ID);
    },

    areas: async (parent, args, { dataSources: {areas} }) => {
      console.log("#Resolvers.areas")
      //return areas.all();
      const rs = await areas.all();
      console.log("### all areas ", rs)
      return rs;
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
