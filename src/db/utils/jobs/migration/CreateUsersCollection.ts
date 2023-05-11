import { glob } from 'glob'
import { validate as uuidValidate } from 'uuid'
import muuid from 'uuid-mongodb'
import fs from 'fs'
import { connectDB, gracefulExit, getUserModel } from '../../../index.js'
import { logger } from '../../../../logger.js'
import { User } from '../../../UserTypes.js'

const LOCAL_MEDIA_DIR_UID = process.env.LOCAL_MEDIA_DIR_UID

if (LOCAL_MEDIA_DIR_UID == null) {
  throw new Error('LOCAL_MEDIA_DIR_UID env not defined')
}

/**
 * Build the media object collection from media files on disk
 */
const onConnected = async (): Promise<void> => {
  // const users = new UserDataSource(mongoose.connection.db.collection('users'))
  logger.info('Creating photo collection')
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

    const { uid, ts } = JSON.parse(f)
    const newUser: Omit<User, 'createdAt' | 'updatedAt'> = {
      userUuid,
      usernameInfo: {
        username: uid as string,
        updatedAt: new Date(ts)
      }

    }
    list.push(newUser)

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
