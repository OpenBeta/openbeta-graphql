/**
 * This code defines a set of unit tests for CommentDataSource.
 * The tests cover three main areas of functionality: comment creation,
 * comment deletion, and comment editing.
 *
 * These are the most rudimentary Operations that may be taken on comments,
 * but says nothing about authorization implementation or scope.
**/

import mongoose from 'mongoose'
import { connectDB, getCommentModel } from '../../db/index.js'
import CommentDataSource from '../CommentDataSource.js'
import muuid, { MUUID } from 'uuid-mongodb'
import { CommentType, SupportedCommentEntities, SupportedCommentEntity } from '../../db/CommentSchema.js'

/**
 * some dummy users (They only need to survive the length of this test).
 */
const users = { coco: muuid.v4(), matthew: muuid.v4(), io: muuid.v4() }

/**
 * We create a bunch of comments, then use the pairing fetch function to test that
 * the two functions are producing the expected results.
 * @returns An array of comments
 */
async function testCommentCreation (): Promise<CommentType[]> {
  const commentDS = new CommentDataSource(mongoose.connection.db.collection('comments'))

  // create one comment per user
  for (const username of Object.keys(users)) {
    // for every letter of this users username we create a comment
    // (This just creates some easy variation to measure function results with)
    for (const char of username.split('')) {
      const comment = await commentDS.addComment({
        userId: users[username as keyof typeof users],
        content: `This is a test comment ${char}`,
        onEntityType: 'climb',
        onEntityId: muuid.v4() // we don't actually enforce climb ID integrity (we support orphans)
      })

      // These two tests should be totally un-needed.
      expect(comment.authorId).toEqual(users[username as keyof typeof users])
      expect(comment.content).toEqual(`This is a test comment ${char}`)
    }
  }

  const allComments: CommentType[] = []
  // test that these comments are getting fetched as expected
  for (const username of Object.keys(users)) {
    // the number of comments we expect to see
    const targetNumber = username.split('').length
    const commentsForUser = await commentDS.commentsByUser(users[username as keyof typeof users])
    expect(commentsForUser.length).toEqual(targetNumber)
    allComments.push(...commentsForUser)
  }

  return allComments
}

/**
 * We create a bunch of comments, then delete them, then make sure they are gone.
 * ensuring that the method correctly deletes comments from the database. It also
 * checks that the commentModel correctly reflects the deletion of the comment.
 */
async function testCommentDeletion (): Promise<void> {
  const commentModel = getCommentModel()
  const commentDS = new CommentDataSource(mongoose.connection.db.collection('comments'))
  const commentsToDelete = await testCommentCreation()

  // delete all comments, once they are gone we should not be able to find them
  for (const comment of commentsToDelete) {
    await commentDS.deleteComment(comment._id)
    const commentAfterDelete = await commentModel.findOne({ _id: comment._id })
    // if we change the behavior of deleting (For example, putting them on hold instead of deleting)
    // this will need to be changed
    expect(commentAfterDelete).toBeNull()
  }
}

/**
 * test that editing changes content, extends history, and updates the updatedAt field
 **/
async function testCommentEdit (): Promise<void> {
  const commentDS = new CommentDataSource(mongoose.connection.db.collection('comments'))

  const g = (idx: number): string => `This comment has been edited ${idx} times`
  const comment = await commentDS.addComment({
    userId: users.coco,
    content: g(0),
    onEntityType: 'climb',
    onEntityId: muuid.v4() // we don't actually enforce climb ID integrity (we support orphans)
  })

  // edit the comment a couple of times
  for (let i = 1; i < 10; i++) {
    const updatedComment = await commentDS.editComment(comment._id, g(i))
    const history = updatedComment.history
    const lastUpdate = updatedComment.lastUpdated
    expect(lastUpdate).not.toBeUndefined()
    if (lastUpdate === undefined) {
      continue
    }

    expect(updatedComment.content).toEqual(g(i))
    expect(history[history.length - 1].content).toEqual(g(i - 1))
    // we expect the last history entry to have a date preceeding the current update time
    if (history.length > 1) {
      expect(history[history.length - 2].date.getTime() < lastUpdate.getTime()).toEqual(true)
    }
    expect(updatedComment.history.length).toEqual(i)
  }
}

/** test that the voting mechanisms are working in the expected way */
async function testCommentVotes (): Promise<void> {
  const commentDS = new CommentDataSource(mongoose.connection.db.collection('comments'))

  const comment = await commentDS.addComment({
    userId: users.coco,
    content: 'a comment that everyone likes',
    onEntityType: 'area',
    onEntityId: muuid.v4() // we don't actually enforce climb ID integrity (we support orphans)
  })
  const commentId = comment._id

  for (const userId of Object.values(users)) {
    await commentDS.upvoteComment({ userId, commentId })
  }
  // we now expect the comment to have all users upvoted
  let commentAfterUpvotes = await commentDS.getComment(comment._id)
  expect(commentAfterUpvotes.upvotes.length).toEqual(Object.keys(users).length)
  expect(commentAfterUpvotes.downvotes.length).toEqual(0)

  // Now set all users to downvote
  for (const userId of Object.values(users)) {
    await commentDS.downvoteComment({ userId, commentId })
  }

  commentAfterUpvotes = await commentDS.getComment(commentId)
  expect(commentAfterUpvotes.downvotes.length).toEqual(Object.keys(users).length)
  expect(commentAfterUpvotes.upvotes.length).toEqual(0)
  // Now set all users to neutral
  for (const userId of Object.values(users)) {
    await commentDS.setVoteState({ userId, commentId, upvote: null })
  }

  commentAfterUpvotes = await commentDS.getComment(comment._id)
  expect(commentAfterUpvotes.downvotes.length).toEqual(0)
  expect(commentAfterUpvotes.upvotes.length).toEqual(0)
}

/**
 * We add 8 comments, 4 on each entity type then we test that the filter specifications
 * in the data source are working as expected.
 */
async function testCommentEntityDiscretion (): Promise<void> {
  const commentDS = new CommentDataSource(mongoose.connection.db.collection('comments'))
  const entities: Array<{type: SupportedCommentEntity, id: MUUID}> = []

  for (const type of SupportedCommentEntities) {
    for (let i = 0; i < 4; i++) {
      const id = muuid.v4()
      // recall for granular query later
      entities.push({ type, id })

      await commentDS.addComment({
        userId: users.coco,
        content: `a comment on a ${type}`,
        onEntityType: type,
        onEntityId: id
      })
    }
  }

  // there are now 4 comments on each entity type. So now we test amalgamation
  for (const type of SupportedCommentEntities) {
    const comments = await commentDS.getCommentByEntity({ entityType: type })
    expect(comments.length).toEqual(4)
  }

  // now we'll test the granular approach
  for (const entity of entities) {
    const comments = await commentDS.getCommentByEntity({ entityType: entity.type, onEntityId: entity.id })
    expect(comments.length).toEqual(1)
  }

  // add extra comments to one entity
  const ent = entities[0]
  for (let i = 0; i < 4; i++) {
    await commentDS.addComment({
      userId: users.coco,
      content: `a comment on a ${ent.type}`,
      onEntityType: ent.type,
      onEntityId: ent.id
    })
  }

  // check that comments show up for the entity
  const comments = await commentDS.getCommentByEntity({ entityType: ent.type, onEntityId: ent.id })
  expect(comments.length).toEqual(1 + 4)
}

describe('Comment Tests', () => {
  const commentModel = getCommentModel()

  beforeAll(async () => {
    await connectDB() // connect to the mongo database
  })

  // When tests are done, close the connection to the database
  afterAll(async () => {
    await mongoose.connection.close()
  })

  afterEach(async () => {
    await getCommentModel().collection.drop()
    await commentModel.ensureIndexes() // should be overkill to ensure indexes every time a test completes
  })

  it('should add comments and produce expected fetch results for those added comments', testCommentCreation)
  it('should add comments and delete those comments', testCommentDeletion)
  it('should add comments and test editing for those comments', testCommentEdit)
  it('should test upvote and downvote behavior', testCommentVotes)
  it('should test simple fetching behavior for entities', testCommentEntityDiscretion)
})
