import { ApolloServerPlugin } from '@apollo/server';

var __id = 0;

export const logginPlugin: ApolloServerPlugin = {
  // Fires whenever a GraphQL request is received from a client.

  async requestDidStart(requestContext) {
    __id += 1;
    let thisid = `request-trace-${__id}`;
    console.time(thisid);

    return {
      // Fires whenever Apollo Server will parse a GraphQL
      // request to create its associated document AST.
      async parsingDidStart(requestContext) {},

      // Fires whenever Apollo Server will validate a
      // request's document AST against your GraphQL schema.
      async validationDidStart(requestContext) {},

      async didEncounterErrors(requestContext) {
        console.error(requestContext.errors);
      },

      async willSendResponse(requestContext) {
        console.timeEnd(thisid);
      },
    };
  },
};
