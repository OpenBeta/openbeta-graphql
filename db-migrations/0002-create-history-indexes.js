/**
 * Issue: 287
 */

db.change_logs.createIndex({ createdAt: -1 })
db.change_logs.createIndex({ 'changes.fullDocument.metadata.area_id': 1, 'changes.kind': 1 })
db.change_logs.createIndex({ 'changes.kind': 1 })