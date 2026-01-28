import { QueryResolvers } from '@gql';
import areaQuery from './area';
import climbQuery from './climb';
import historyQuery from './history';
import mediaQuery from './media';
import organizationQuery from './organization';
import tagQuery from './tag';
import tickQuery from './tick';
import userQuery from './user';

const queries: QueryResolvers = {
  ...areaQuery,
  ...climbQuery,
  ...historyQuery,
  ...tagQuery,
  ...userQuery,
  ...organizationQuery,
  ...mediaQuery,
  ...tickQuery,
};

export default queries;
