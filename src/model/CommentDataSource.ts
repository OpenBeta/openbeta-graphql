import { MongoDataSource } from 'apollo-datasource-mongodb'
import { getCommentModel } from '../db/index.js'
import { CommentHistory, CommentType, getTagsFromContent, SupportedCommentEntity } from '../db/CommentSchema'
import { MUUID } from 'uuid-mongodb'

export default class TickDataSource extends MongoDataSource<CommentType> {
  commentModel = getCommentModel()

  /** Create a comment on an entity
   * (No auth check is done in this function. NEVER implement this function without checking
   * the user's identity and matching it against this ID)
   */
  async addComment (
    /** The ID of the user that has authored this comment */
    userId: string | MUUID,
    /** The raw content to enter. This will be validated */
    content: string,
    /** The type of entity this comment will be created on */
    onEntityType: SupportedCommentEntity,
    /** The entity ID for which this comment will be created on */
    onEntityId: string | MUUID): Promise<CommentType> {
    return await this.commentModel.create({
      authorId: userId,
      onEntity: onEntityType,
      onEntityId: onEntityId,
      content: content,
      tags: getTagsFromContent(content)
    })
  }

  /** Edit the contents of a comment
   * (No auth check is done in this function. NEVER implement this function without checking
   * the user's identity and matching it against this ID)
   */
  async editComment (commentId: string | MUUID, newContent: string): Promise<CommentType> {
    const comment = await this.commentModel.findOne({ _id: commentId })
    if (comment === null) {
      throw new Error('Comment not found')
    }

    // collapse all whitespace such that (n)spaces are always entered as (1)space.
    // "hello    world  " -> "hello world"
    const formattedContent = newContent.trim().split(' ').filter((word) => word.length > 0).join(' ')

    if (formattedContent === comment.content) {
      throw new Error('Comment content is unchanged')
    }

    const historyEntry: CommentHistory = {
      date: new Date(),
      // the previous content
      content: comment.content
    }

    // push the history entry
    comment.history.push(historyEntry)
    // assign the new content. Mongoose should re-run validation
    // on this field before saving
    comment.content = formattedContent
    // refresh the last updated date
    comment.lastUpdated = historyEntry.date
    // update the tag references, as they may have changed
    comment.tags = getTagsFromContent(formattedContent)

    // save the comment in place
    await comment.save()
    return comment
  }

  /**
   * Delete a comment
   * (No auth check is done in this function. NEVER implement this function without checking
   * the user's identity and matching it against this ID)
   *
   * Only moderators and the author of the comment can delete a comment. There may be other contexts
   * in which a comment can be deleted, and they should be documented in their respective functions.
   */
  async deleteComment (commentId: string | MUUID): Promise<boolean> {
    const deleteResult = await this.commentModel.deleteOne({ _id: commentId })
    if (deleteResult.deletedCount === 0) {
      throw new Error('Comment not deleted')
    }

    return true
  }

  /**
   * Mark a user as having upvoted a comment. behavior is set with the toggle parameter.
   * If the user previously downvoted the comment, then this will remove the downvote
   */
  async upvoteComment (
    /** Who is upvoting this comment? */
    userId: string | MUUID,
    /** which comment is being voted on */
    commentId: string | MUUID,
    /**
     * If true, this will toggle the upvote state between true and false
     * If false, then this will set the upvote state to true (idempotent)
     */
    toggle?: boolean): Promise<CommentType> {
    if (toggle === true) {
      const comment = await this.commentModel.findOne({ _id: commentId, upvotes: userId })

      // toggle upvote off, as it is already set
      if (comment !== null) {
        return await this.setVoteState(userId, commentId, null)
      }
    }

    // set upvote to true for this user on this comment
    return await this.setVoteState(userId, commentId, true)
  }

  /**
   * Mark a user as having downvoted a comment. behavior is set with the toggle parameter.
   * If the user previously upvote the comment, then this will remove the upvote
   */
  async downvoteComment (
    /** Who is downvoting this comment? */
    userId: string | MUUID,
    /** which comment is being voted on */
    commentId: string | MUUID,
    /**
     * If true, this will toggle the downvote state between true and false.
     * If false, then this will set the downvote state to true (idempotent)
     */
    toggle?: boolean): Promise<CommentType> {
    if (toggle === true) {
      const comment = await this.commentModel.findOne({ _id: commentId, downvotes: userId })

      // toggle downvote off
      if (comment !== null) {
        return await this.setVoteState(userId, commentId, null)
      }
    }

    // set upvote for this user on this comment
    return await this.setVoteState(userId, commentId, false)
  }

  async setVoteState (
    /** user setting their vote state */
    userId: string | MUUID,
    /** which comment to operate on */
    commentId: string | MUUID,
    /**
     * if true, then upvote. if false, downvote. if set to null,
     * then remove all sentiment signals and set to neutral
     */
    upvote: boolean | null
  ): Promise<CommentType> {
    const comment = await this.commentModel.findOne({ _id: commentId })

    if (comment === null) {
      throw new Error(`Comment not found with id ${commentId.toString()}`)
    }

    // Scrub the slate clean and set to neutral
    const res = await this.commentModel.findOneAndUpdate({ _id: commentId }, {
      $pullAll: {
        upvotes: [userId.toString()],
        downvotes: [userId.toString()]
      }
    }, { new: true })

    if (res === null) {
      throw new Error('Failed to remove votes from comment')
    }

    if (upvote === true) {
      const term = await this.commentModel.findOneAndUpdate({ _id: commentId }, {
        $push: {
          // push the user ID into the upvotes array
          upvotes: userId.toString()
        }
      }, { new: true })

      if (term === null) { throw new Error('Failed to upvote comment') }
      return term
    }

    if (upvote === false) {
      const term = await this.commentModel.findOneAndUpdate({ _id: commentId }, {
        $push: {
          // push the user ID into the upvotes array
          downvotes: userId.toString()
        }
      }, { new: true })

      if (term === null) { throw new Error('Failed to upvote comment') }
      return term
    }

    // nothing else specified, just return the scrubbed comment
    return res
  }

  /**
   * get comments authored by a given user.
   * This code is more documentation than anything else, I would recommend implementing
   * the model directly inside resolvers so that you can specify sensible limits and other
   * such scopes.
   * */
  async commentsByUser (userId: string | MUUID): Promise<CommentType[]> {
    return await this.commentModel.find({ author: userId.toString() })
  }

  /**
   * get comments appearing on a given entity.
   * When implementing this funciton, you may import the SupportedCommentEntity enum and use
   * it directly, or you may enter a valid string. The types system will guide you, and I strongly
   * recommend not overriding it, as the enum defines the guiderails. anything outside of it WILL
   * fail validation.
   **/
  async commentsBy (entityType: SupportedCommentEntity, id?: string): Promise<CommentType[]> {
    if (id === undefined) {
      return await this.commentModel.find({ onEntityType: entityType })
    }

    return await this.commentModel.find({ onEntityId: id.toString(), onEntityType: entityType })
  }
}
