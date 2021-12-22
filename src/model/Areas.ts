import { MongoDataSource } from "apollo-datasource-mongodb";
import { AreaType } from "../db/AreaTypes";

// export type ClimbDatasourceType = MongoDataSource<IClimb>

export default class Areas extends MongoDataSource<AreaType>{
  async all(props) {
    const rs =this.collection.find({})
    //console.log("#Area:all() ", await rs.toArray())
    return rs.toArray()
  }
  // climbClimbById(id: string) {
  //   return this.findOneById(id);
  // }
}
