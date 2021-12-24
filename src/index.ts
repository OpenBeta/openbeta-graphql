import { ApolloServer  } from "apollo-server";
import { ApolloServerPluginLandingPageGraphQLPlayground} from "apollo-server-core"
import { connection } from "mongoose";
import { schema as graphQLSchema } from "./schema";
import Climbs from "./model/Climbs";
import { connectDB } from "./db";
import Areas from "./model/Areas";

const server = new ApolloServer({
  //cors: false,
  // introspection: true,
  schema: graphQLSchema,
  dataSources: () => {
    return {
      climbs: new Climbs(connection.db.collection("Climb")),
      areas: new Areas(connection.db.collection("areas")),
    };
  }
});

connectDB();

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
