import { Schema, Model, connection } from "mongoose";
import { IClimb, IClimbMetadata } from "./ClimbTypes";

const MetadataSchema = new Schema<IClimbMetadata>({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  left_right_index: { type: Number, required: false },
  mp_id: { type: String, required: false },
  climb_id: { type: String, required: true, unique: true }
});

export const ClimbSchema = new Schema<IClimb>({
  name: { type: String, required: true },
  fa: { type: String, required: true },
  type: { type: Schema.Types.Mixed },
  safety: { type: String, required: false },
  metadata: MetadataSchema,
});

export const create_climb_model = (): Model<IClimb> => {
  return connection.model("Climbs", ClimbSchema);
};
