import { QueryResolvers } from '@gql';
import areaQuery from './area';
import climbQuery from './climb';
import mediaQuery from './media';
import organizationQuery from './organization';
import tickQuery from './tick';
import userQuery from './user';

const queries: QueryResolvers = {
  ...areaQuery,
  ...climbQuery,
  ...userQuery,
  ...organizationQuery,
  ...mediaQuery,
  ...tickQuery,
};

export default queries;
