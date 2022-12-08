import mongoose from 'mongoose'

/** manifest tick object that exists within the mongodb database. */
export interface TickType extends UnindentifiedTick {
  _id: mongoose.Types.ObjectId
  /**
   * Different to dateClimbed, this is out of the user's control and they
   * may not change the date they created the tickObject
   */
  dateCreated: Date
  /**
   * Users may update existing tick fields, so we keep track of when they
   * last updated the tick. We could easily hold onto history - but I would
   * really wonder if this is a necessary feature.
   */
  dateUpdated?: Date
}

/** Ticks possess no assigned ID prior to being manifest inside their mongo collection */
export interface UnindentifiedTick {
  name: string
  climbId: string
  userId: string
  dateClimbed: string
  grade: string
  source: string
  notes?: string
  style?: string
  attemptType?: string
}
