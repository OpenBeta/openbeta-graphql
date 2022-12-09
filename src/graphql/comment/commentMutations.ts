import { CommentType } from '../../db/CommentSchema'
import muuid, { MUUID } from 'uuid-mongodb'
import { AuthUserType, ContextWithAuth } from '../../types'

/** Throw an error if the current user session does not contain identity */
function requireLogin (user: AuthUserType): MUUID {
  if (typeof user === 'undefined' || (user.uuid == null)) {
    throw new Error('You must be logged in to perform this action')
  }

  return user.uuid
}

/** Throw an error if the current user session does not indicate ownership of a given comment */
function requireUserOwnsComment (user: AuthUserType | any, comment: CommentType): MUUID {
  const userId = requireLogin(user)
  if (userId !== comment.authorId) {
    throw new Error('You do not own this comment')
  }
  return userId
}

const CommentMutations = {
  createComment: async (_: any, input: {content: any, onEntityType: any, entityId: any}, { dataSources, user }: ContextWithAuth): Promise<CommentType> => {
    const userId = requireLogin(user)
    const { comments } = dataSources

    return await comments.addComment({
      userId,
      content: input.content,
      onEntityType: input.onEntityType,
      onEntityId: muuid.from(input.entityId)
    })
  },

  deleteComment: async (_: any, input, { dataSources, user }: ContextWithAuth): Promise<boolean> => {
    const { comments } = dataSources
    const comment = await comments.getComment(muuid.from(input.commentId))
    requireUserOwnsComment(user, comment) // validate that the user owns this comment

    return await comments.deleteComment(muuid.from(input.commentId))
  },

  editComment: async (_: any, input: {content: any, commentId: any}, { dataSources, user }: ContextWithAuth): Promise<CommentType> => {
    const { comments } = dataSources
    const comment = await comments.getComment(muuid.from(input.commentId))
    requireUserOwnsComment(user, comment) // validate that the user owns this comment

    if (typeof input.commentId === 'undefined') {
      throw new Error('Must specify commentId')
    }

    if (typeof input.content === 'undefined') {
      throw new Error('Must specify new content to edit this comment')
    }

    return await comments.editComment(
      muuid.from(input.commentId), // edit this comment
      input.content // with this new content
    )
  },

  setVoteState: async (_: any, input: {commentId: any, upvote: any}, { dataSources, user }: ContextWithAuth): Promise<CommentType> => {
    const userId = requireLogin(user)
    const { comments } = dataSources

    if (typeof input.commentId === 'undefined') {
      throw new Error('Must specify commentId')
    }

    const upvote = input.upvote

    if (upvote !== null && typeof upvote !== 'boolean') {
      throw new Error('Must assert voteState as null or boolean, not undefined')
    }

    return await comments.setVoteState({
      userId,
      commentId:
        muuid.from(input.commentId),
      upvote
    }
    )
  }
}

export default CommentMutations
