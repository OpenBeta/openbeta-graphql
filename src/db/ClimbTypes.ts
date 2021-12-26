export type IClimb = IClimbProps & {
  metadata: IClimbMetadata;
};

export interface IClimbProps {
  name: string;
  fa?: string;
  yds: string;
  type: IClimbType;
  safety: SafetyType;
}

export enum SafetyType {
  UNSPECIFIED = "UNSPECIFIED",
  PG = "PG",
  PG13 = "PG13",
  R = "R",
  X = "X",
}

export interface IClimbType {
  trad: boolean;
  sport: boolean;
  bouldering: boolean;
  alpine: boolean;
  mixed: boolean;
  aid: boolean;
  tr: boolean;
}

export interface IClimbMetadata {
  lat: number | null;
  lng: number | null;
  left_right_index: number;
  mp_id?: string;
  climb_id: string;
}
