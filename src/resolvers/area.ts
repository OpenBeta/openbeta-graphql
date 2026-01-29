import { QueryResolvers, Resolvers } from '@gql';

export const areaResolvers: Resolvers['Area'] = {
  id: async (parent) => parent.uuid,
  area_name: async (parent) => parent.name,
  areaName: async (parent) => parent.name,
};
