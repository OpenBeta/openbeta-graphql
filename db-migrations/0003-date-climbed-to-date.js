/**
 * https://github.com/OpenBeta/openbeta-graphql/pull/301
 **/

const rs = db.ticks.updateMany(
  {
    dateClimbed: { $exists: true }
  },
  [{
    $set: {
      dateClimbed: {
        $dateFromString: {
          dateString: '$dateClimbed',
          // We want to ascribe an hour of day to the climb, so it shows
          // up on the correct day when displayed in the user's timezone.
          // Most climbs are in the US, MT time is a good first approximation.
          timezone: 'America/Denver'
        }
      }
    }
  }]
)

printjson(rs)
