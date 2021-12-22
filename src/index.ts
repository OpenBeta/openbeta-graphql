import { ApolloServer } from "apollo-server";
import { connection } from "mongoose";
import { schema as graphQLSchema } from "./schema";
import Climbs, { ClimbDatasourceType } from "./model/Climbs";
import { connectDB, create_area_model, create_climb_model } from "./db";
import Areas from "./model/Areas";
//import {create_model} from "./db/ClimbSchema"

const mongoose = connectDB();

const server = new ApolloServer({
  schema: graphQLSchema,
  dataSources: () => {
    return {
      climbs: new Climbs(connection.db.collection("Climb")),
      areas: new Areas(connection.db.collection("areas")),
    };
  },
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
