import { connectDB } from ".";
import { Model, Mongoose } from "mongoose";
import { create_area_model } from ".";
import { load_areas } from "./utils";
import { AreaType } from "./AreaTypes";

const contentDir =
  "../opentacos-content/content/USA/Oregon/Mt. Hood/Petes Pile";

const mongoose = connectDB();
mongoose.then(async () => {
  const areaModel: Model<AreaType> = create_area_model();

  load_areas(contentDir, (area) => {
    console.log(JSON.stringify(area, null, 2));
    areaModel.create(area);
  });
  //areas[0].children = climbs;

  //areaModel.create(areas);
  //model.create(climbs);
});
