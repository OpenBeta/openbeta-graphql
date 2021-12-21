import { connect, connection } from "mongoose";

require('dotenv').config()

console.log(process.env.MONGGO_USER, process.env.MONGO_PASSWORD)

export const mongoose = connect(`mongodb://${process.env.MONGGO_USER}:${process.env.MONGO_PASSWORD}@localhost:27017/opentacos?authSource=admin`);


connection.once("open", function () {
  console.log("Connected successfully");
});

connection.on(
  "error",
  console.error.bind(console, "MongoDB connection error:")
);
