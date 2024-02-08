import {MUUID} from 'uuid-mongodb'
import {Point} from '@turf/helpers'
import {ClientSession} from "mongoose";

export const muuidToString = (m: MUUID): string => m.toUUID().toString()

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
export function exhaustiveCheck(_value: never): never {
  throw new Error(`ERROR! Enum not handled for ${JSON.stringify(_value)}`)
}

export const geojsonPointToLongitude = (point?: Point | undefined): number | undefined => point?.coordinates[0]
export const geojsonPointToLatitude = (point?: Point): number | undefined => point?.coordinates[1]

export const NON_ALPHANUMERIC_REGEX = /[\W_\s]+/g
export const canonicalizeUsername = (username: string): string => username.replaceAll(NON_ALPHANUMERIC_REGEX, '')


// withTransaction() doesn't return the callback result
// see https://jira.mongodb.org/browse/NODE-2014
export const withTransaction = async <T>(session: ClientSession, closure: () => Promise<T>): Promise<T | undefined> => {
  let result: T | undefined;
  await session.withTransaction(async () => {
    result = await closure();
    return result;
  });
  return result;
};