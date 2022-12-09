import mongoose from 'mongoose'
import muuid, { MUUID } from 'uuid-mongodb'
const { Schema } = mongoose

/** This enum represents entities for which comments are supported.
 * Implementations of comment interfaces (Like GQL, not type interfaces)
 * should lean on this enumeration to ensure that typescript will catch
 * incomplete implementations.
 *
 * Creation / fetching of comments should have an entirely flat implementation.
 * As a result, adding new supported entities should be trivial.
 */
export const _SupportedCommentEntity = {
  tick: 'tick',
  climb: 'climb',
  post: 'post',
  user: 'user',
  media: 'media',
  area: 'area'
}

/** This enum represents entities for which comments are supported.
 * Implementations of comment interfaces (Like GQL, not type interfaces)
 * should lean on this enumeration to ensure that typescript will catch
 * incomplete implementations.
 *
 * Creation / fetching of comments should have an entirely flat implementation.
 * As a result, adding new supported entities should be trivial.
 */
export type SupportedCommentEntity = keyof typeof _SupportedCommentEntity
export const SupportedCommentEntities: SupportedCommentEntity[] = Object.keys(_SupportedCommentEntity) as any

/** For moderation purposes, we record the history of each comment edit.
 * This presents as a list of edits, with the date of the edit and the content.
 * We make some assumptions about reasonable usage for edits, limiting the maximum
 * number of edits to somewhere in the region of 500, after which the user will
 * be barred from editing the comment further.
 */
export interface CommentHistory {
  date: Date
  content: string
}

interface CommentTags {
  users: string[]
  climbs: string[]
  areas: string[]
}

/**
 * Comments may appear on virtually any entity in or outside of the database.
 * They contain freely composed text, and may be interacted with by users to
 * signal sentiment.
 *
 * Users may signal their sentiment by upvoting or downvoting a comment. The
 * implementation presented here is not scalable forever - but should comfortably
 * take us to 100k votes per comment, which may take us years to reach.
 */
export interface CommentType {
  /** The ID of this comment in the collection */
  _id: MUUID
  /** The ID of the user who created this comment */
  authorId: MUUID
  /**
   * What entity TYPE does this comment appear on. Comments can appear on a
   * supported set of entity types
   */
  onEntityType: SupportedCommentEntity
  /** The ID of the entity that this comment appears on. */
  onEntityId: string | MUUID
  /** The date at which this comment was created in the database */
  createdAt: Date
  /** If the comment has been edited, when was the last edit date */
  lastUpdated?: Date
  /**
   * Free text field authored by the owning user.
   * Content may contain tagged entities, which are an extension of standard markdown.
   * The notation of tags will be parsed prior to entry into the database, and will be
   * rejected if the content is malformed / relation does not exist.
   *
   * Regular GitHub markdown is also supported, and will be validated and formatted
   * prior to entry. It is really difficult to make violated markdown, but it is possible.
   */
  content: string
  /** Edit history of this comment. Mostly critical for moderation over anything else */
  history: CommentHistory[]
  /**
   * Which users have explitly marked this comment as good.
   * This related to a users UUID, not their username.
   */
  upvotes: string[]
  /**
   * Which users have explitly marked this comment as bad.
   * This related to a users UUID, not their username.
   */
  downvotes: string[]
  /** Is this comment hidden? Comments may be hidden for a number of reasons, though most of them
   * revolve around moderation and review latency. */
  hidden: boolean
  /** Has editing for this comment been locked */
  editLocked: boolean

  /**
   * content field may contain tagged entities. The tag is enforced by their ID,
   * so we record the tagged entities here.
   */
  tags: CommentTags
}

const CommentHistorySchema = new Schema<CommentHistory>({
  date: { type: Date, required: true, immutable: true, default: Date.now },
  content: { type: String, required: true }
})

/**
 * Before allowing comment entry, ensure that tags in the body are valid.
 * To be valid they must relate to an existing entity in the database, and
 * be fully-formed (which is to say, parse-able).
 */
function validateCommentContent (v: string): boolean {
  return true
}

const CommentSchema = new Schema<CommentType>({
  /** we use MUUID over ObjectID by convention */
  _id: {
    type: 'object',
    value: { type: 'Buffer' },
    default: () => muuid.v4()
  },
  authorId: {
    type: 'object',
    value: { type: 'Buffer' },
    required: true, // comments may not exist without a user to own them
    index: true, // we want to be able to query comments by user quickly
    // prohibit disowning of comments. users who create a comment may not transfer ownership
    immutable: true
  },
  onEntityType: {
    type: String,
    enum: Object.keys(_SupportedCommentEntity), // One of these supported entities
    required: true, // comments must be on an entity
    index: true // we want to be able to query comments by entity type quickly
  },
  // The ID of the entity that this comment appears on.
  onEntityId: {
    // Entities have heterogeneous ID types, but we are moving to use UUID over
    // object ID so we are implementing this as forward-looking rather than
    // perfectly compatible.
    type: 'object',
    value: { type: 'Buffer' },
    required: true,
    index: true // need to find comments by entity ID quickly\
  },
  createdAt: { type: Date, required: true, immutable: true, default: Date.now },
  lastUpdated: { type: Date, required: false }, // last date in the history array

  // content of this comment.
  content: {
    type: String,
    required: true,
    // We have a custom validator registered to prevent malformed tag entry
    // into the database. This will make comment tags more robust in terms
    // of their relational reliability
    validate: {
      validator: validateCommentContent,
      message: 'Comment content did not satisfy tagging validation'
    },
    maxLength: 2000, // we limit comment length to 2000 characters (similar to discord limits, if you don't have a reference point)
    minLength: 1 // we don't allow empty (or single-character) comments
  },
  // is this comment hidden from regular users?
  // resolvers will not send these back to users unless they are moderators
  hidden: { type: Boolean, required: true, default: false, index: true },
  editLocked: { type: Boolean, required: true, default: false },
  // recall comment history
  history: {
    type: [CommentHistorySchema],
    default: [], // empty array by default.
    required: true,
    // we call vast edit quantity a sign of spam, and limit it to 500
    validate: [(val: Array<typeof CommentHistorySchema>) => val.length <= 500, '{history exceeds the limit of 500']
  },
  upvotes: { type: [String], required: true, default: [] },
  downvotes: { type: [String], required: true, default: [] }
})

// Create a composite index on the entityType and entity ID.
// Strictly speaking this should be unnecessary, but we want to implement something
// that will resist breaking if we swap ID types for any reason in the future.
CommentSchema.index({ onEntity: 1, onEntityId: 1 }, { unique: false })

export const getCommentModel = (
  name: string = 'comment'
): mongoose.Model<CommentType> => {
  return mongoose.model(name, CommentSchema)
}
