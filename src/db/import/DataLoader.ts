import { connectDB } from "..";
import { Model } from "mongoose";
import { create_area_model } from "..";
import { load_areas } from "./utils";
import { AreaType } from "../AreaTypes";
import {link_areas} from "./LinkParent"
const contentDir = "../opentacos-content/content/USA/Oregon";

const mongoose = connectDB();

mongoose.then(async () => {
  const areaModel: Model<AreaType> = create_area_model();

  var i = 0;
  await load_areas(contentDir, (area) => {
    i+=1
    areaModel.insertMany(area, {ordered: false});
  });
  console.log("# Loaded ", i)

  await link_areas()
  console.log("Areas linked")
});
