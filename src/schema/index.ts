import { makeExecutableSchema } from "@graphql-tools/schema";

import { typeDef as Climb } from "./Climb";
import { typeDef as Area } from "./Area";

const resolvers = {
  Query: {
    climb: async (parent, { ID }, { dataSources }) => {
      console.log(ID);
      return dataSources.climbs.findOneById(ID);
    },

    areas: async (
      parent,
      { name, nameContains },
      { dataSources: { areas } }
    ) => {
      if (name) return areas.findByName(name);
      if (nameContains) return areas.findByName(nameContains, true);

      return await areas.all();
    },

    area: async (parent, { id }, { dataSources: { areas } }) => {
      console.log(id);
      if (id) return areas.findOneById(id);
      return null;
    },
  },
  Area: {
    children: async (parent, args, { dataSources: { areas } }) => {
      if (parent.children.length > 0) {
        return areas.findManyByIds(parent.children);
      }
      return null;
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs: [Climb, Area],
  resolvers,
});
