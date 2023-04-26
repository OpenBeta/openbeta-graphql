import { MUUID } from 'uuid-mongodb'
import axios, { AxiosResponse } from 'axios'

export const cdnHttpClient = axios.create({
  baseURL: process.env.CDN_URL ?? '',
  timeout: 2000
}
)

export const muuidToString = (m: MUUID): string => m.toUUID().toString()

interface UID_TYPE {
  uid: string
}

/**
 * Given a user uuid, locate the media server for the user home dir and their nick name
 * @param uuid
 * @returns user nick name or `null` if not found
 */
export const getUserNickFromMediaDir = async (uuid: string): Promise<string | null> => {
  let res: AxiosResponse<UID_TYPE> | undefined
  try {
    res = await cdnHttpClient.get<UID_TYPE>(`/u/${uuid}/uid.json`)
    if (res.status >= 200 && res.status <= 204) {
      return res?.data?.uid ?? null
    } else return null
  } catch (e) {
    console.log(`Error fetching /u/${uuid}/uid.json`, res?.statusText)
    return null
  }
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
