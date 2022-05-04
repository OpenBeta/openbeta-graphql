import muid from 'uuid-mongodb'

import { MediaType } from '../../db/MediaTypes.js'
import { getMediaModel } from '../../db/index.js'

const MediaMutations = {
  setTags: async (
    _,
    { input },
    { dataSources }) => {
    const { mediaUuid, mediaType, mediaUrl, srcType, srcUuid }: MediaType = input
    const doc: MediaType = {
      mediaUuid: muid.from(mediaUuid),
      mediaType,
      mediaUrl,
      srcType,
      srcUuid: muid.from(srcUuid)
    }
    const media = getMediaModel()
    const newDoc = await media.findOneAndUpdate({ mediaUuid: doc.mediaUuid }, doc, { new: true, upsert: true })
    return newDoc
  }
}

export default MediaMutations
