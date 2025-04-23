// This migration will fix ticks where the style was set to a value that belongs in attemptType instead, specifically for boulders
// this is likely specific to one user, but it can be run for all ticks that may be affected.

// Move the value of style to attemptType (and capitalize it)
const incorrectBoulderTick1Rs = db.ticks.updateMany(
  {
    $or: [
      { style: 'send' },
      { style: 'attempt' },
      { style: 'flash' }
    ]
  },
  [
    {
      $set: {
        attemptType: {
          $switch: {
            branches: [
              { case: { $eq: ['$style', 'send'] }, then: 'Send' },
              { case: { $eq: ['$style', 'attempt'] }, then: 'Attempt' },
              { case: { $eq: ['$style', 'flash'] }, then: 'Flash' }
            ]
          }
        }
      }
    }
  ]
);

// Set style to 'Boulder'
const incorrectBoulderTick2Rs = db.ticks.updateMany(
  {
    $or: [
      { style: 'send' },
      { style: 'attempt' },
      { style: 'flash' }
    ]
  },
  [
    {
      $set: { style: 'Boulder' }
    }
  ]
);

printjson(incorrectBoulderTick1Rs);
printjson(incorrectBoulderTick2Rs);