// This migration will fix ticks where attemptType has a value that belongs in style instead.
const attemptTypeToStyleRs = db.ticks.updateMany(
  {
    $or: [
      { attemptType: 'Lead' },
      { attemptType: 'TR' },
      { attemptyType: 'Follow' },
      { attemptyType: 'Solo' },
      { attemptyType: 'Aid' },
      { attemptyType: 'Boulder' }
    ]
  },
  [
    {
      $set: {
        style: {
          $switch: {
            branches: [
              { case: { $eq: ['$attemptType', 'Lead'] }, then: 'Lead' },
              { case: { $eq: ['$attemptType', 'TR'] }, then: 'TR' },
              { case: { $eq: ['$attemptType', 'Follow'] }, then: 'Follow' },
              { case: { $eq: ['$attemptType', 'Solo'] }, then: 'Solo' },
              { case: { $eq: ['$attemptType', 'Aid'] }, then: 'Aid' },
              { case: { $eq: ['$attemptType', 'Boulder'] }, then: 'Boulder' }
            ],
            default: '$style'
          }
        }
      }
    }
  ]
);

// Now nullify the attemptType field since we've moved that value to style
const nullifyAttemptTypeRs = db.ticks.updateMany(
  {
    $or: [
      { attemptType: 'Lead' },
      { attemptType: 'TR' },
      { attemptyType: 'Follow' },
      { attemptyType: 'Solo' },
      { attemptyType: 'Aid' },
      { attemptyType: 'Boulder' }
    ]
  },
  {
    $unset: { attemptType: "" }
  }
);

printjson(attemptTypeToStyleRs);
printjson(nullifyAttemptTypeRs);