import { gql } from 'apollo-server'

export const typeDef = gql`
  type Query {
    climb(uuid: ID): Climb
  }

  """
  Climbs are part of the critical data we deal with from pretty much any other
  graphql type in the schema. Climbs (climbing routes) are the primary thing that
  openbeta is all about
  """
  type Climb {
    id: ID!
    "The most common name for this climb"
    name: String!
    """
    Alternate names that this climb goes by.
    Will include alternate verbage and spelling for climb names
    For example, if the climb name is 'girl on our minds' then alternate names may be
    ['girl on my mind', 'girl on our mind'] or whatever the community commonly flubs the
    the name as. This is only for actual alternate names, does not include spelling ERRORS,
    only legitimate confusion over what the name for this route is; Where the community is
    actually divided in terms of how a climb is refferred to.

    Another legitimate case may be 'Surfing in the waves with dolphins' with alt name ['Dolphin']
    (Genuine case where most people generally never refer to the name it was opened with)
    """
    alternateNames: [String!]
    "First recorded ascent for this climb"
    fa: String!
    """
    The Yosemite Decimal System grade for this climb. This is not an i18n-safe field,
    and when grades are properly localized this field will almost certainly be abandoned.
    https://en.wikipedia.org/wiki/Yosemite_Decimal_System
    """
    yds: String!
    """
    The type of climbing that this route is for. Is it a bouldering route requiring pads?
    or is it something else? Climbs may have multiple climb types (e.g: Sport can be alpine)
    as a result we have an array of assignments
    """
    type: ClimbType!
    safety: SafetyEnum!
    metadata: ClimbMetadata!
    content: Content!
    """
    The names of areas tracing up the hierarchy to the root.
    """
    pathTokens: [String!]!
    """
    Area objects tracing its way all the way to the top of the hierarchy 
    To get greater context of this climb.
    """
    pathToRoot: [Area!]
    ancestors: [String!]!
    media: [MediaTagType]
  }

  type ClimbMetadata {
    """
    Recorded latitude for this climb
    """
    lat: Float
    """
    Recorded longitude for this climb
    """
    lng: Float
    """
    If you stand facing the crag or boulder that this climb is on, what order does it appear
    in with respect to the other (known) climbs on the crag?
    """
    leftRightIndex: Int

    """
    (For climbs inherited from mountain project) what is the Mountain project ID of this climb?
    """
    mp_id: String
  }

  type Content {
    "free text description of this climb. Where it is, what it looks like, overall beta, etc."
    description: String
    """
    free text location information for this climb
    Notes, for example, about approaching the climb, identifying the climb, or just information
    about the place in which it  is.
    """
    location: String
    "free text entry describing what protection/gear a climber needs to make a safe attempt of the route"
    protection: String
  }

  """
  Designates a climbing style OR discipline. Can be mixed and matched together
  """
  type ClimbType {
    trad: Boolean
    sport: Boolean
    bouldering: Boolean
    alpine: Boolean
    mixed: Boolean
    aid: Boolean
    tr: Boolean
  }

  """
  An optional protection rating indicates the spacing and quality of the protection 
  available for a well-equipped and skilled leader. The letter codes chosen were, 
  at the time, identical to the American system for rating the content of movies, 
  except that there is no commonly recognized distinction between PG and PG13

  taken from:
  https://en.wikipedia.org/wiki/Yosemite_Decimal_System#Protection_rating
  """
  enum SafetyEnum {
    UNSPECIFIED
    """
    Fair protection. Falls may be long but a competent leader can place enough protection 
    to avoid serious risk of injury. 
    """
    PG 
    """
    Fair protection. Falls may be long but a competent leader can place enough protection 
    to avoid serious risk of injury. 
    """
    PG13
    """
    Run-out climbing. Some protection placements may be far enough apart so that it is not 
    possible to protect against hitting the ground or a ledge. 
    """
    R
    """
    Protection is unavailable or so sparse that any fall is likely to result 
    in death or serious injury. 
    """
    X
  }
`
