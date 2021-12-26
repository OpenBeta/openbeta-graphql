import { Schema, Model, connection } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { IClimb, IClimbMetadata, SafetyType } from "./ClimbTypes";

const MetadataSchema = new Schema<IClimbMetadata>({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  climb_id: { type: String, required: true, default: () => uuidv4() },
});

export const ClimbSchema = new Schema<IClimb>({
  name: { type: Schema.Types.String, required: true },
  yds: { type: Schema.Types.String, required: false },
  fa: { type: Schema.Types.String, required: false },
  type: { type: Schema.Types.Mixed },
  safety: {
    type: Schema.Types.String,
    enum: Object.values(SafetyType),
    required: true,
  },
  metadata: MetadataSchema,
});

export const create_climb_model = (): Model<IClimb> => {
  return connection.model("Climbs", ClimbSchema);
};
