import { MediaType } from '../../db/MediaTypes'

const MediaResolver = {
  mediaUuid: (node: MediaType) => node.mediaUuid.toUUID().toString(),
  srcUuid: (node: MediaType) => node.srcUuid.toUUID().toString()
}
// mediaList: (node: any) => {
//   console.log('#resolver', node)
//   return node.mediaList
// }

export default MediaResolver
