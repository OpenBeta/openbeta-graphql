import { IClimbType } from '../../ClimbTypes'

export interface IFlatClimbTypes {
  typeSport: boolean
  typeTrad: boolean
  typeTR: boolean
  typeBouldering: boolean
  typeMixed: boolean
  typeAlpine: boolean
  typeSnow: boolean
  typeIce: boolean
  typeAid: boolean
}

export const flattenDisciplines = (type: IClimbType): IFlatClimbTypes => {
  return {
    typeSport: type?.sport ?? false,
    typeTrad: type?.trad ?? false,
    typeTR: type?.tr ?? false,
    typeBouldering: type?.boulder ?? false,
    typeMixed: type?.mixed ?? false,
    typeAlpine: type?.alpine ?? false,
    typeSnow: type?.snow ?? false,
    typeIce: type?.ice ?? false,
    typeAid: type?.aid ?? false
  }
}

export const disciplinesToArray = (type: IClimbType): any => {
  const z: string[] = []
  for (const property in type) {
    if (type[property] as boolean) {
      z.push(property)
    }
  }
  return z
}
