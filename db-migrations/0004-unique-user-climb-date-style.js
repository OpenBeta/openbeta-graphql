/**
 * https://github.com/OpenBeta/open-tacos/issues/631
 **/

rs1 = db.ticks.createIndex({ userId: -1 })
rs2 = db.ticks.createIndex({ userId: -1, climbId: -1 })
rs3 = db.ticks.dropIndex({ climbId: 1, dateClimbed: 1, style: 1, userId: 1, source: 1 })

printjson(rs1)
printjson(rs2)
printjson(rs3)
