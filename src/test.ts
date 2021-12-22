import { connectDB } from "./db";
import { Model, Mongoose } from "mongoose";
import { IClimb } from "./db/ClimbTypes";
import { create_climb_model, create_area_model } from "./db";
import { load_climbs, load_areas } from "./db/utils";
import { AreaType } from "./db/AreaTypes";

const contentDir =
  "../opentacos-content/content/USA/Oregon/Mt. Hood/Petes Pile/Quirky Combat Wall";

const mongoose = connectDB();
mongoose.then(async (foos: Mongoose) => {
  const model: Model<IClimb> = create_climb_model();
  const areaModel: Model<AreaType> = create_area_model();

  //const area
  const climbs = await load_climbs(contentDir);
  const areas = await load_areas(contentDir);
  areas[0].children = climbs;
  console.log(areas);
  areaModel.create(areas);
  //model.create(climbs);
});
