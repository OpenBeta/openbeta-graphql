import { Resolvers } from '@gql';
import { aggregateTypeResolvers } from './aggregate';
import { areaResolvers } from './area';
import { climbResolvers } from './climb';
import { gradeResolvers } from './grade';
import { historyResolvers } from './history';
import { mediaResolvers } from './media';
import Mutation from './mutations';
import { organizationResolvers } from './organization';
import Query from './query';
import { tagResolvers } from './tag';
import { tickResolvers } from './tick';
import { userResolvers } from './user';

export const resolvers: Resolvers = {
  Area: areaResolvers,
  Climb: climbResolvers,
  UserPublicProfile: userResolvers,
  Organization: organizationResolvers,
  MediaWithTags: mediaResolvers,
  TickType: tickResolvers,
  Tag: tagResolvers,
  AggregateType: aggregateTypeResolvers,
  GradeType: gradeResolvers,
  History: historyResolvers,
  // Query and mutation resolvers are different than the node resolvers.
  Query,
  Mutation,
};
