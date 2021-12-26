import { connectDB } from "..";
import { Model, connection } from "mongoose";
import { create_area_model } from "..";
import { load_areas } from "./utils";
import { AreaType } from "../AreaTypes";
import { link_areas } from "./LinkParent";

const contentDir = process.env.CONTENT_BASEDIR;

if (!contentDir) {
  console.log("Missing CONTENT_BASEDIR env")
  process.exit(1)
}

const main = async () => {
  const mongoose = await connectDB();

  const tmpArea = "_tmp_areas";
  _dropCollection(tmpArea);

  const areaModel: Model<AreaType> = create_area_model(tmpArea);

  var i = 0;
  await load_areas(contentDir, (area) => {
    i += 1;
    areaModel.insertMany(area, { ordered: false });
  });

  console.log("Content basedir: ", contentDir);
  console.log("Loaded ", i);

  await link_areas(tmpArea);
  console.log("Areas linked");
  console.log("Dropping old collection...");
  await _dropCollection("areas");
  await mongoose.connection.db.renameCollection(tmpArea, "areas");
  console.log("Done.");
};

const _dropCollection = async (name: string) => {
  try {
    await connection.db.dropCollection(name);
  } catch (e) {}
};

(async function () {
  await main();
  process.exit(0);
})();
