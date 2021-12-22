import { MongoDataSource } from "apollo-datasource-mongodb";
import { IClimb } from "../db/ClimbTypes";

export type ClimbDatasourceType = MongoDataSource<IClimb>

export default class Climbs extends MongoDataSource<IClimb>{
  // climbClimbById(id: string) {
  //   return this.findOneById(id);
  // }
}
