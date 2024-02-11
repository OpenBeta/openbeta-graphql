/*
* This file is a mod of src/auth/middleware.ts and is used when starting the server via `yarn serve-dev`
* It bypasses the authentication for local development
*/
import muuid, { MUUID } from 'uuid-mongodb'
import { AuthUserType } from '../../types.js'
import { logger } from '../../logger.js'

export const localDevBypassAuthContext = (() => {
  const testUUID: MUUID = muuid.v4()

  return async ({ req }): Promise<any> => {
    const user: AuthUserType = {
      roles: ['user_admin', 'org_admin', 'editor'],
      uuid: testUUID,
      isBuilder: false
    }
    logger.info(`The user.roles for this session is: ${user.roles.toString()}`)
    return { user }
  }
})()
