import { Schema, Model, connection } from "mongoose";
import { AreaType, IAreaMetadata } from "./AreaTypes";
import {ClimbSchema} from "./ClimbSchema"

const MetadataSchema = new Schema<IAreaMetadata>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  area_id: { type: String, required: true, unique: true }
});

const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true },
  children: [ClimbSchema],
  metadata: MetadataSchema
});

export const create_area_model = (): Model<AreaType> => {
  return connection.model("areas", AreaSchema);
};
