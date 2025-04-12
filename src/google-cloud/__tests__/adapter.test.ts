import MutableMediaDataSource from '../../model/MutableMediaDataSource'
import inMemoryDB from '../../utils/inMemoryDB'
import { mediaAdded, standardMessageHandlingLifecycle } from '../adapter-interface'
import { MediaObject } from '../../db/MediaObjectTypes'
import { jest } from '@jest/globals'

describe('Media storage notification adapter tests', () => {
  let mediaDs: MutableMediaDataSource
  // Our handler will take a trip past the database so we will need to provision the
  // database for this suite of tests
  beforeAll(async () => { await inMemoryDB.connect(); mediaDs = MutableMediaDataSource.getInstance() })
  afterAll(async () => await inMemoryDB.close())

  async function unreifiedMedia (): Promise<MediaObject> {
    const [ref] = await mediaDs.mediaObjectModel.insertMany([{
      mediaUrl: `${process.uptime()}.test`,
      width: 100,
      height: 100,
      format: 'test',
      size: 1200,
      // 10 second expiry
      expiresAt: new Date().getTime() + 10_000
    }])

    return await mediaDs.mediaObjectModel.findById(ref._id).orFail(new Error('woops'))
  }

  async function reifiedMedia (): Promise<MediaObject> {
    const [ref] = await mediaDs.mediaObjectModel.insertMany([{
      mediaUrl: `${process.uptime()}.test`,
      width: 100,
      height: 100,
      format: 'test',
      size: 1200
    }])

    return await mediaDs.mediaObjectModel.findById(ref._id).orFail(new Error('woops'))
  }

  describe('standardMessageHandlingLifecycle', () => {
    let mockWork: jest.Mock<(media: MediaObject, mutableDs: MutableMediaDataSource) => Promise<void>>

    beforeEach(() => {
      mockWork = jest.fn()
    })

    it('should return early if media object is not found in the database, throwing no error and not performing work', async () => {
      await standardMessageHandlingLifecycle({ objectId: 'no such thing' }, mockWork)
      expect(await mediaDs.mediaObjectModel.findOne({ mediaUrl: 'test-url' }))
      expect(mockWork).not.toHaveBeenCalled()
    })

    it('should return early if media object has expiresAt as null (already reified)', async () => {
      const media = await reifiedMedia()
      await standardMessageHandlingLifecycle({ objectId: media.mediaUrl }, mockWork)
      expect(mockWork).not.toHaveBeenCalled()
    })

    it('should execute the work function for a valid, unreified media object found in the database', async () => {
      const media = await unreifiedMedia()
      await standardMessageHandlingLifecycle({ objectId: media.mediaUrl }, mockWork)
      expect(mockWork).toHaveBeenCalled()
    })

    it('should re-throw error from work function', async () => {
      const media = await unreifiedMedia()
      await expect(standardMessageHandlingLifecycle(
        { objectId: media.mediaUrl },
        () => {
          throw new Error('error in work')
        }
      )
      ).rejects.toThrow(new Error('error in work'))
    })
  })

  describe('mediaAdded', () => {
    it('should not attempt to update if the media object is not found', async () => {
      const media = await unreifiedMedia()
      await mediaDs.mediaObjectModel.deleteOne({ _id: media._id })
      await mediaAdded({ objectId: media.mediaUrl })
      await mediaAdded({ objectId: 'does not exist' })
    })

    it('should update the media object to unset expiresAt if found and not already reified', async () => {
      const media = await unreifiedMedia()
      await mediaAdded({ objectId: media.mediaUrl })
      expect(await mediaDs.mediaObjectModel.findOne({ mediaUrl: media.mediaUrl }).then(x => x?.expiresAt)).toBeNull()
    })

    it('should not attempt to update if the media object is already reified', async () => {
      const media = await reifiedMedia()
      await mediaAdded({ objectId: media.mediaUrl })
      expect(await mediaDs.mediaObjectModel.findOne({ mediaUrl: media.mediaUrl }).then(x => x?.expiresAt)).toBeNull()
    })
  })
})
