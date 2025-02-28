// This migration will update all ticks that have values of "N/A" for style or attemptType by unsetting those fields
const tickStyleNullificationRs = db.ticks.updateMany(
  {
    style: "N/A"
  },
  {
    $unset: { style: "" }
  }
);

const tickAttemptTypeNullificationRs = db.ticks.updateMany(
  {
    attemptType: "N/A"
  },
  {
    $unset: { attemptType: "" }
  }
);

printjson(tickStyleNullificationRs);
printjson(tickAttemptTypeNullificationRs);