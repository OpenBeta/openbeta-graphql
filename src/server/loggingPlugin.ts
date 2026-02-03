import { ApolloServerPlugin } from '@apollo/server';

export const logginPlugin: ApolloServerPlugin = {
  // Fires whenever a GraphQL request is received from a client.

  async requestDidStart(requestContext) {
    console.timeLog(requestContext.queryHash);
    console.log('Request started! Query:\n' + requestContext.request.query);

    return {
      // Fires whenever Apollo Server will parse a GraphQL
      // request to create its associated document AST.
      async parsingDidStart(requestContext) {
        console.log('Parsing started!');
      },

      // Fires whenever Apollo Server will validate a
      // request's document AST against your GraphQL schema.
      async validationDidStart(requestContext) {
        console.log('Validation started!');
      },

      async didEncounterErrors(requestContext) {
        console.error(requestContext.errors);
      },

      async willSendResponse(requestContext) {
        console.timeLog(requestContext.queryHash);
      },
    };
  },
};
