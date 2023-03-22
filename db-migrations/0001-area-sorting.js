/**
 * Issue: 221
 */

const rs = db.areas.updateMany({}, { $rename: { 'metadata.left_right_index': 'metadata.leftRightIndex' } })

printjson(rs)
