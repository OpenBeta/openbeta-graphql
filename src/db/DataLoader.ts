import { connectDB } from ".";
import { Model, Mongoose } from "mongoose";
import { create_area_model } from ".";
import { load_areas } from "./utils";
import { AreaType } from "./AreaTypes";

const contentDir = "../opentacos-content/content/USA/Oregon";

const mongoose = connectDB();
mongoose.then(async () => {
  const areaModel: Model<AreaType> = create_area_model();

  var i = 0;
  await load_areas(contentDir, (area) => {
    i+=1
    //console.log("##", JSON.stringify(area, null, 2));
    //console.log("   #", area.area_name, area.climbs.length)
    areaModel.insertMany(area, {ordered: false});
  });

  console.log("# end of DataLoader()", i)
  //areas[0].children = climbs;

  //areaModel.create(areas);
  //model.create(climbs);
});
