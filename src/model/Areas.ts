import { MongoDataSource } from "apollo-datasource-mongodb";
import { AreaType } from "../db/AreaTypes";

// export type ClimbDatasourceType = MongoDataSource<IClimb>

export default class Areas extends MongoDataSource<AreaType> {
  async all(props) {
    const rs = this.collection.find({});
    return rs.toArray();
  }

  /**
   * Wildcard, case-insensitive search for area(s). Similar SQL Like '%a%'.
   * @param name area name
   */
  async findByName(name: string, wildcard: boolean = false) {
    const param = wildcard ? new RegExp(name, "ig") : name;
    return this.collection.find({ area_name: param }).toArray();
  }
}
