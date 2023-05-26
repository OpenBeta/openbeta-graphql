import mongoose from 'mongoose'

/**
 * Ticks may be sourced from a number of places. They may come from external sources,
 * or may have been logged natively within OpenBeta. This enum represents the supported
 * sources for ticks (as in: Which sources is OpenBeta capable of understanding and
 * interpreting?)
 */
export type TickSource =
  /** Native tick, created here in openbeta and a strong liklihood of relational integrity */
  'OB' |
  /**
   * Tick from mountainproject. Medium liklihood of data overlap, but potential divergence
   * as the two projects grow independently.
   */
  'MP'

export const TickSourceValues: TickSource[] = ['OB', 'MP']

/** Ticks
 * Ticks represent log entries for a user's climbing activity. They contain
 * pointers to the climb, user, and some additional context for the climb.
 */
export interface TickType extends TickInput {
  _id: mongoose.Types.ObjectId
}

export interface TickInput {
  /**
   * freeform text field that a user fills out as commentary on this tick. This unstructured data
   * is one of the most important ones on the tick, as users may give their human opinion on the
   * climb attempt that they made.
   *
   * Sandbagged, Chipped, bad conditions, may all be examples of notes that a user may submit to accompany
   * the tick.
   * */
  notes: string

  /**
   * The name of this climb.
   *
   * When the tick is imported from an external data source, there is no relational guarentee,
   * and as such we need this field filled out to be able to display the name of the climb.
   *
   * Native ticks may have this field enforced against the climb that it relates to.
   * If the name changes in its related climb document, the value stored here may be back-updated
   * to reflect the new name.
   */
  name: string

  /**
   * Which climb is ascociated with this tick? There is weak-relationship between this ID
   * and a climb document in the climbs collection. This is because we support importing
   * climbs from external sources, and we may not have a climb document for every climb
   *
   * When source is OpenBeta, this can be understood as a foreign key to the climbs collection uuid.
   */
  climbId: string
  /** User that this tick belongs to */
  userId: string

  /**
   * Arbitrary string that represents the style of the climb.
   * Lead, toprope, bouldering, would be examples of values you might find here.
   * If this is a native tick, you can enforce updated values here by referencing
   * the climb document (climbId -> climbs:uuid)
   */
  style: string

  /**
   * Describe the type of successful attempt that was made here.
   * Fell/Hung, Flash, Redpoint, Onsight, would be examples of values you might find here.
   * This is again a free-form field. Data of practically any descriptive nature may find
   * itself here.
   */
  attemptType: string

  /**
   * Not the same as date created. Ticks can be back-filled by the user, and do
   * not need to be logged at the time that the tick is created inside the mongo
   * database.
   * This is a string because we do not enforce any particular date format at this time.
   */
  dateClimbed: string

  /**
   * What grade is this tick ascociated with?
   * This exists in the tick document both for easy-fetching and to ensure
   * proper operation when importing ticks for entities that cannot be located
   * within OpenBeta's database.
   * */
  grade: string

  /**
   * we support any number of sources for tick import or native ticks,
   * they are logged in this field and helps us to know where ticks were
   * created.
   */
  source: TickSource
}

export interface TickEditFilterType {
  _id: mongoose.Types.ObjectId
}
