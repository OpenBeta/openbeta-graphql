import { MutationResolvers } from '@gql';
import { areaMutations } from './area';
import { climbMutations } from './climb';
import { mediaMutations } from './media';
import { organizationMutations } from './organization';
import { tickMutations } from './tick';
import { userMutations } from './user';

const Mutation: MutationResolvers = {
  ...areaMutations,
  ...climbMutations,
  ...userMutations,
  ...organizationMutations,
  ...mediaMutations,
  ...tickMutations,
};

export default Mutation;
