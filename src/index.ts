import { mongoose } from "./db/index";
import { Model, Mongoose } from "mongoose";
import { IClimb } from "./db/Types";

import { create_model } from "./db/Schemas";
import { load_dir } from "./db/utils";
const climbs = [
  {
    name: "Quiet Ninja",
    type: { trad: true },
    yds: "5.10b/c",
    safety: "",
    fa: "Yannick Gingras and Yen Kha, Aug. 2020",
    metadata: {
      id: "833b3ae5-b308-4c39-b4cc-f5c399763452",
      mp_id: "119438923",
      lng: -121.568433,
      lat: 45.405378,
      left_right_index: "6",
    },
  },
  {
    name: "Quantum Kung Fu",
    type: { trad: true },
    yds: "5.10-",
    safety: "",
    fa: "Yannick Gingras and Max Huecksteadt, Aug. 2020",
    metadata: {
      id: "d8f6deae-93dd-49b4-bbaf-37b222412aa1",
      mp_id: "119339794",
      lng: -121.5680734,
      lat: 45.4055654,
      left_right_index: "4",
    },
  },
];

const contentDir =
  "../opentacos-content/content/USA/Oregon/Mt. Hood/Petes Pile/Quirky Combat Wall";

mongoose.then(async (foos: Mongoose) => {
  const model: Model<IClimb> = create_model();
  const climbs = await load_dir(contentDir);
  console.log(climbs)
  model.create(climbs);
});
