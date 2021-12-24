import { get_area_model } from "../AreaSchema";

export const link_areas = async () => {
  try {
    const areasModel = get_area_model();
    for await (const area of areasModel.find()) {
      //console.log(area.get("area_name"))
      const pathHash = area.get("pathHash");

      // find all areas whose parent = my pathHash (aka subareas)
      const subareas = await areasModel.find({ parentHashRef: pathHash });
      if (subareas.length === 0) continue;

      const refs = subareas.reduce((acc, curr) => {
        acc.push(curr.get("_id"));
        return acc;
      }, []);

      area.set("children", refs);
      area.save();

      // console.log(
      //   `${area.get("area_name")} -> (${subareas.length}) ${refs}`
      // );
    }

    // const oregon = await areasModel
    //   .find({ area_name: "Oregon" })
    //   .populate("children")
    // console.log(JSON.stringify(oregon, null, 2));
  } catch (e) {
    console.log(e);
  }
};

export default link_areas;