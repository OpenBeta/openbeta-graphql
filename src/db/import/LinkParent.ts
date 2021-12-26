import { getAreaModel } from '../AreaSchema'

export const linkAreas = async (collectionName: string): Promise<void> => {
  try {
    const areasModel = getAreaModel(collectionName)
    for await (const area of areasModel.find()) {
      // console.log(area.get("area_name"))
      const pathHash = area.get('pathHash')

      // find all areas whose parent = my pathHash (aka subareas)
      const subareas = await areasModel.find({ parentHashRef: pathHash })
      if (subareas.length === 0) continue

      const refs = subareas.reduce((acc: string[], curr) => {
        acc.push(curr.get('_id'))
        return acc
      }, [])

      area.set('children', refs)
      await area.save()
    }
  } catch (e) {
    console.log(e)
  }
}

export default linkAreas
