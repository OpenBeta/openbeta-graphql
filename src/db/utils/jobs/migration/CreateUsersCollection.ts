import { glob } from 'glob'
import { validate as uuidValidate } from 'uuid'
import muuid from 'uuid-mongodb'
import fs from 'fs'
import { ManagementClient as Auth0MgmtClient } from 'auth0'
import type { User as Auth0User } from 'auth0'

import { connectDB, gracefulExit, getUserModel } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { User, UpdateProfileGQLInput } from '../../../UserTypes.js'
import { nonAlphanumericRegex } from '../../../../model/UserDataSource.js'

const LOCAL_MEDIA_DIR_UID = process.env.LOCAL_MEDIA_DIR_UID

if (LOCAL_MEDIA_DIR_UID == null) {
  throw new Error('LOCAL_MEDIA_DIR_UID env not defined')
}

/**
 * Create a new Users collection from uid.json files in local media dir.
 */
const onConnected = async (): Promise<void> => {
  logger.info('Creating users collection')
  const model = getUserModel()
  await model.ensureIndexes()
  const uidFIle = await glob(LOCAL_MEDIA_DIR_UID, {
    nodir: true,
    stat: false,
    withFileTypes: true
  })

  let list: Array<Omit<User, 'createdAt' | 'updatedAt'>> = []
  let count = 0
  for (const file of uidFIle) {
    const folderUuidStr = file.parent?.name ?? ''
    if (!uuidValidate(folderUuidStr)) {
      logger.error({ file: file.name, parent: folderUuidStr }, 'Error: expect folder name to have uuid format.  Found ')
      continue
    }
    const userUuid = muuid.from(folderUuidStr)
    const f = fs.readFileSync(file.fullpath(), 'utf-8')

    const { ts } = JSON.parse(f)
    const metadataFromAuth0 = await getUserMetadata(folderUuidStr)

    if (metadataFromAuth0 == null) continue

    const { username, email, displayName, website, bio } = metadataFromAuth0

    const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
      _id: userUuid,
      email,
      displayName,
      bio,
      website,
      usernameInfo: {
        username,
        canonicalName: username.replaceAll(nonAlphanumericRegex, ''),
        updatedAt: new Date(ts)
      },
      createdBy: userUuid
    }
    list.push(newUser)

    // await changelogDataSource._testRemoveAll()
    // eslint-disable-next-line
    await new Promise(res => setTimeout(res, 1500))

    if (list.length === 40) {
      const rs = await model.insertMany(list)
      count = count + rs.length
      list = []
    }
  }

  if (list.length > 0) {
    await model.insertMany(list)
    count = count + list.length
  }

  logger.info({ count }, 'Finish')

  await gracefulExit()
}

void connectDB(onConnected)

const auth0ManagementClient = new Auth0MgmtClient({
  domain: process.env.AUTH0_TENANT ?? '',
  clientId: process.env.AUTH0_CLIENT_ID ?? '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET ?? '',
  scope: 'read:users'
})

type UserFromAtuh0 = Required<UpdateProfileGQLInput>

const getUserMetadata = async (userUuid: string): Promise<UserFromAtuh0 | null> => {
  const users: Auth0User[] = await auth0ManagementClient.getUsers({ q: `user_metadata.uuid="${userUuid}"` })

  if (users?.length === 0) {
    logger.warn('User not found ', userUuid)
    return null
  }

  // Exclude legacy passwordless accounts
  const newEmailPasswordUsers = users.filter(u => u.user_id?.startsWith('auth0'))

  if (newEmailPasswordUsers.length === 0) {
    logger.warn('Account not found in Auth0.  Skipping ' + userUuid)
    return null
  }
  if (newEmailPasswordUsers.length > 1) throw new Error('Multple users found for the same uuid ' + userUuid)

  const user = newEmailPasswordUsers[0]

  console.log('#user ', newEmailPasswordUsers, userUuid)
  const { user_metadata: umeta } = user

  if (umeta == null) throw new Error('Expect user_metadata but found null: ' + JSON.stringify(user))
  if (umeta.nick == null || user.email == null) throw new Error('Expect nick and email but found null: ' + JSON.stringify(user))

  return {
    userUuid,
    username: umeta.nick,
    email: user.email ?? '',
    displayName: umeta.displayName ?? '',
    bio: umeta.bio ?? '',
    website: umeta?.website ?? ''
  }
}
