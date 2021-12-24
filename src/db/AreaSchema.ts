import { Schema, Model, connection, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { AreaType, IAreaMetadata } from "./AreaTypes";
import { ClimbSchema } from "./ClimbSchema";

const MetadataSchema = new Schema<IAreaMetadata>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  area_id: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4(),
  },
});

const AreaSchema = new Schema<AreaType>({
  area_name: { type: String, required: true },
  climbs: [{ type: ClimbSchema, required: true }],
  children: [{ type: Types.ObjectId, ref: "areas", required: true }],
  metadata: MetadataSchema,
  parentHashRef: { type: String, required: true },
  pathHash: { type: String, required: true },
});

export const create_area_model = (): Model<AreaType> => {
  AreaSchema.index({ area_name: 1 });
  return connection.model("areas", AreaSchema);
};

export const get_area_model = (): Model<AreaType> =>
  connection.model("areas", AreaSchema);
