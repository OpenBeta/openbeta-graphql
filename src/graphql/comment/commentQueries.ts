import { CommentType, getCommentModel, SupportedCommentEntities } from '../../db/CommentSchema.js'
import CommentDataSource from '../../model/CommentDataSource.js'
import muuid from 'uuid-mongodb'

const CommentQueries = {

  comment: async (_: any, input: { uuid: any }, { dataSources }: any): Promise<CommentType> => {
    const { comments }: { comments: CommentDataSource } = dataSources
    const { uuid } = input
    return await comments.getComment(uuid)
  },
  commentsByUser: async (_: any, input: { uuid: any, limit: any, page: any }, { dataSources }: any): Promise<CommentType[]> => {
    const { comments }: { comments: CommentDataSource } = dataSources
    const { uuid, limit, page } = input
    return await comments.commentsByUser(uuid, { page, limit })
  },
  recentCommentsByEntity: async (_: any, input: { entityType: any, entityId: any }, { dataSources }: any): Promise<CommentType[]> => {
    const { comments }: { comments: CommentDataSource } = dataSources
    const { entityType, entityId } = input

    if (typeof entityId !== 'string') {
      throw new Error('Must specify entityId')
    }

    if (!SupportedCommentEntities.includes(entityType)) {
      throw new Error(`Invalid entity entityType must be one of ${SupportedCommentEntities.join(', ')}`)
    }

    return await comments.getCommentByEntity({ entityType, onEntityId: muuid.from(entityId) })
  },
  recentComments: async (_: any, input: { limit?: 100 | undefined, page?: 0 | undefined }): Promise<CommentType[]> => {
    const { limit = 100, page = 0 } = input

    return await getCommentModel()
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(page * limit)
  }

}

export default CommentQueries
