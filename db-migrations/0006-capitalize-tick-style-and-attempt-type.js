// This migration will update all tick styles and attemptTypes with incorrect capitalization
const tickCapitalizationRs = db.ticks.updateMany(
  {
    $or: [
      { style: 'lead' },
      { style: 'follow' },
      { style: 'tr' },
      { style: 'top_rope' },
      { style: 'solo' },
      { style: 'aid' },
      { style: 'boulder' },
      { attemptType: 'onsight' },
      { attemptType: 'redpoint' },
      { attemptType: 'flash' },
      { attemptType: 'pinkpoint' },
      { attemptType: 'send' },
      { attemptType: 'attempt' },
      { attemptType: 'frenchfree' },
      { attemptType: 'repeat' }
    ]
  },
  [
    {
      $set: {
        style: {
          $switch: {
            branches: [
              { case: { $eq: ['$style', 'lead'] }, then: 'Lead' },
              { case: { $eq: ['$style', 'follow'] }, then: 'Follow' },
              { case: { $eq: ['$style', 'tr'] }, then: 'TR' },
              { case: { $eq: ['$style', 'top_rope'] }, then: 'TR' },
              { case: { $eq: ['$style', 'solo'] }, then: 'Solo' },
              { case: { $eq: ['$style', 'aid'] }, then: 'Aid' },
              { case: { $eq: ['$style', 'boulder'] }, then: 'Boulder' }
            ],
            default: '$style'
          }
        },
        attemptType: {
          $switch: {
            branches: [
              { case: { $eq: ['$attemptType', 'redpoint'] }, then: 'Redpoint' },
              { case: { $eq: ['$attemptType', 'onsight'] }, then: 'Onsight' },
              { case: { $eq: ['$attemptType', 'flash'] }, then: 'Flash' },
              { case: { $eq: ['$attemptType', 'pinkpoint'] }, then: 'Pinkpoint' },
              { case: { $eq: ['$attemptType', 'send'] }, then: 'Send' },
              { case: { $eq: ['$attemptType', 'attempt'] }, then: 'Attempt' },
              { case: { $eq: ['$attemptType', 'frenchfree'] }, then: 'Frenchfree' },
              { case: { $eq: ['$attemptType', 'repeat'] }, then: 'Repeat' }
            ],
            default: '$attemptType'
          }
        }
      },
    }
  ]
);

printjson(tickCapitalizationRs);