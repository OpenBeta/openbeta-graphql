import { MUUID } from 'uuid-mongodb'
import { Point } from '@turf/helpers'
import { ClientSession, ClientSessionOptions } from 'mongoose'

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
export function exhaustiveCheck (_value: never): never {
  throw new Error(`ERROR! Enum not handled for ${JSON.stringify(_value)}`)
}

export const geojsonPointToLongitude = (point?: Point | undefined): number | undefined => point?.coordinates[0]
export const geojsonPointToLatitude = (point?: Point): number | undefined => point?.coordinates[1]

export const NON_ALPHANUMERIC_REGEX = /[\W_\s]+/g
export const canonicalizeUsername = (username: string): string => username.replaceAll(NON_ALPHANUMERIC_REGEX, '')

// withTransaction() doesn't return the callback result
// see https://jira.mongodb.org/browse/NODE-2014
export const withTransaction = async <T>(session: ClientSession, closure: () => Promise<T>): Promise<T | undefined> => {
  let result: T | undefined
  await session.withTransaction(async () => { result = await closure() }) as T
  return result
}

interface SessionStartable {
  startSession: (options?: ClientSessionOptions) => Promise<ClientSession>
}

export const useOrCreateTransaction = async<T>(owner: SessionStartable, session: ClientSession | undefined, closure: (session: ClientSession) => Promise<T>): Promise<T | undefined> => {
  const reifiedSession = session ?? await owner.startSession()

  try {
    if (reifiedSession.inTransaction()) {
      return await closure(reifiedSession)
    } else {
      return await withTransaction(reifiedSession, async () => await closure(reifiedSession))
    }
  } finally {
    // If the session was created in this context we can close it out.
    if (session == null) {
      await reifiedSession.endSession()
    }
  }
}

/** Like useOrCreateTransaction but will treat any call to  `session.abortTransaction()` as an
 * exception (
 *  which is not necessarily best practice, but the assumption here is that we have no
 *  meaningful way of resolving data to a user unless the transaction succeeds all at once.
 * )
 */
export const resolveTransaction = async<T>(owner: SessionStartable, session: ClientSession | undefined, closure: (session: ClientSession) => Promise<T>): Promise<T> => {
  const result = await useOrCreateTransaction(owner, session, closure)
  if (result === undefined) throw new Error('Transaction was explicitly ended but we did not account for that logic here')
  return result
}
