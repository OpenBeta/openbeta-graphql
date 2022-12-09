import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    comment(uuid: ID): Comment
    """
    get all comments by a given user, ordered by date.
    If you opt not to paginate, ALL comments will be returned.
    """
    commentsByUser(userId: ID!, page: Int, pageSize: Int): [Comment!]
    """
    Query all comments on a given entity. This is the most common use-case for comments.
    While it is possible to get all comments for a given entity without an ID in mind, we
    have not exposed that functionality in the GQL schema.

    If you need it for some reason, I suggest you add an additional query that allows
    entityId to be nullable (or removes it entirely)
    """
    commentsOnEntity(entityType: SupportedCommentEntity!, entityId: ID!): [Comment!]
    """
    Globally query all recent comments in the system. with optional pagination and limit.
    By default page size is 100, and page is 0
    """
    recentComments(limit: Int, page: Int): [Comment!]
  }

  type Mutation {
    """
    Create a new comment on a given entity.
    Requires user to submit auth token in request
    """
    createComment(content: String!, onEntityType: SupportedCommentEntity!, entityId: ID!): Comment!
    """
    Delete a comment. If this comment has replies, those replies will be deleted as well.
    Requires user to submit auth token in request
    """
    deleteComment(id: ID!): Comment!
    """
    Edit the content of a comment. This will create a new history entry for this comment.
    Requires user to submit auth token in request
    """
    editComment(id: ID!, content: String!): Comment!
    """
    Set weather or not this user has upvoted this comment.
    If upvote is true, the user will upvote the comment.
    If upvote is false, the user will remove their upvote from the comment.
    If upvote is null, the user will remove their vote from the comment.

    Requires user to submit auth token in request
    """
    setVoteState(commentId: ID!, upvote: Boolean): Comment!
  }

  """
  Comment history is recorded for the sake of moderation
  """
  type CommentHistory {
    """
    The date at which this edit was pushed into the history
    """
    date: Date!
    """
    Entire content body of the comment at the time of this edit
    """
    content: String!
    """
    The first 250 characters of the content body, useful in glanceable contexts
    """
    summary: String!
  }

  type Comment {
    """
    Use this field to address this comment in queries.
    """
    uuid: ID!
    """
    The ID of the user who authored this comment
    """
    authorId: ID!
    """
    The actual comment body, which can be up to 2000 characters long and will be 1 or more characters long.
    """
    content: String!

    """
    If the user is logged in, this will resolve to a CommentUserContext object,
    otherwise null.

    This is important if building visual components, as it informs how this user has
    already interacted with the content (or other user-specific info that might or might not
    be worth showing them visually)
    """
    context: CommentUserContext
    
    """
    Comments may be edited for a host of reasons, but for the purpose of moderation,
    we keep and expose a history of edits. Note that to keep this query reasonable,
    this will resolve up to a certain number of characters
    """
    history: [CommentHistory!]!
    """
    How many users have up-voted this comment?
    """
    upvotes: Int!
    """
    How many users have down-voted this comment?
    """
    downvotes: Int!
    """
    How many replies does this comment have?
    """
    replyCount: Int!
    """
    The replies that this comment has received. If null, then this comment is not permitted to
    have replies. Some comment contexts only support a fixed-depth of replies, meaning that
    comments may not appear in infinite hierarchies.

    If comments are permitted but simply don't exist, this will resolve to an empty array.
    """
    replies: [Comment!]
    """
    You do not need to commit to resolving replies, you can use this field to determine
    whether or not this comment is permitted to recieve replies.
    """
    canHaveReplies: Boolean!

    """
    When was this comment created?
    """
    createdAt: Date!
    """
    If this comment has been edited, what date was logged?
    """
    lastUpdated: Date

    """
    In most use-cases, you will resolve comments as children of another entity that is already\
    a known quantity. But in global contexts this is critical for generating clickable
    references to whatever entity this comment is on.

    This is the type of entity that this comment is on or about.
    """
    onEntityType: SupportedCommentEntity!
    """
    The ID of the entity that this comment is on or about.
    """
    onEntityId: ID!
  }

  """
  If User context is available, you can resolve a number of data points
  that will be entirely dependant on the current user's session context
  """
  type CommentUserContext {
    """
    Has this user upvoted this comment?
    If explicitly true, then the user has upvoted the comment.
    if explicitly false, then the user has downvoted the comment.
    if null, then the user has not signaled either.
    """
    upvoted: Boolean
    """
    There are a number of contexts under which a user may be authorized to delete a comment. 
    This field will be true if the user is authorized to delete this comment, and false otherwise.

    Examples of cases in which a user may be authorized are:
    1) The user is a moderator
    2) The user is the author
    3) The comment appears on a post that the author owns
    """
    canDelete: Boolean!

    """
    Is the user allowed to edit this comment? users will never be permitted to alter a comment
    they do not own, but there are some contexts in which a user may not be allowed to edit their OWN
    comment. For example, if that comment has exceeded the number of edits allowed.
    """
    canEdit: Boolean!
  }

  """
  These are all the entity types on which comments can be made.
  """
  enum SupportedCommentEntity {
    tick
    climb
    post
    user
    media
    area
  }
`
