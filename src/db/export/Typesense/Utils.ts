import { IClimbType } from '../../ClimbTypes'

export interface IFlatClimbTypes {
  typeSport: boolean
  typeTrad: boolean
  typeTR: boolean
  typeBouldering: boolean
  typeMixed: boolean
  typeAlpine: boolean
  typeAid: boolean
}

export const flattenDisciplines = (type: IClimbType): IFlatClimbTypes => {
  return {
    typeSport: type?.sport ?? false,
    typeTrad: type?.trad ?? false,
    typeTR: type?.tr ?? false,
    typeBouldering: type?.bouldering ?? false,
    typeMixed: type?.mixed ?? false,
    typeAlpine: type?.alpine ?? false,
    typeAid: type?.aid ?? false
  }
}

export const disciplinesToEnums = (type: IClimbType): any => {
  const s = `${type?.sport ? 'sport' : ''} ${type?.trad ? 'trad' : ''} ${type?.tr ? 'tr' : ''} ${type?.bouldering ? 'bouldering' : ''} ${type?.mixed ? 'mixed' : ''} ${type?.alpine ? 'alpine' : ''} ${type?.aid ? 'aid' : ''}`
  return s
}
