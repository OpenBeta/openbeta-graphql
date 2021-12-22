import { connect, connection } from "mongoose";
import { create_area_model } from "./AreaSchema";
import { create_climb_model } from "./ClimbSchema";

require("dotenv").config();

const connectDB = () => {
  console.log("Connecting to database...");
  const mongoose = connect(
    `mongodb://${process.env.MONGGO_USER}:${process.env.MONGO_PASSWORD}@localhost:27017/opentacos?authSource=admin`
  );

  connection.once("open", function () {
    console.log("DB connected successfully");
  });

  connection.on(
    "error",
    console.error.bind(console, "MongoDB connection error:")
  );
  return mongoose;
};

export { connectDB, create_area_model, create_climb_model };
