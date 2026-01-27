import { AreaType } from '../../AreaTypes.js'
import path from 'path'

export function resolveAreaFileName (area: Partial<AreaType>): string {
  const name = normalizeName(area.area_name)
  if (name === undefined || name === '') { return 'unknown' } else { return name }
}

export function resolveAreaSubPath (area: Partial<AreaType>): string {
  const paths: string[] = area.pathTokens?.map(normalizeName)
    .map(token => token ?? '')
    .filter(token => token !== '') ?? []
  return path.join(...paths)
}

function normalizeName (name?: string): string | undefined {
  return name?.trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .replace(/\s\s+/g, ' ')
    .replace(/ /g, '_')
}
