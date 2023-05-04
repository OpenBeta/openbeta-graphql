import { MUUID } from 'uuid-mongodb'

export const muuidToString = (m: MUUID): string => m.toUUID().toString()

/**
 * Detects if string is in uuid-mongodb's "canonical" base64 format.
 * @param s input string
 * @returns
 */
export const isBase64Str = (s: string): boolean => {
  const bc = /[A-Za-z0-9+/=]/.test(s)
  const lc = /.*=$/.test(s) // make sure it ends with '='
  return bc && lc
}

/**
 * Ensures that type-checking errors out if enums are not
 * handled exhaustively in switch statements.
 * Eg.
 * switch(val) {
 *   case enumOne:
 *   ...
 *   default:
 *     exhaustiveCheck(val)
 * }
 * @param _value
 */
export function exhaustiveCheck (_value: never): never {
  throw new Error(`ERROR! Enum not handled for ${JSON.stringify(_value)}`)
}
