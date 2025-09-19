// For each document that has children, we want to tell its children to back-link to us.
db.areas
  .find({ children: { $exists: true, $type: "array" } })
  .forEach((parentDoc) =>
    db.areas.updateMany(
      { _id: { $in: parentDoc.children } },
      { $set: { parent: parentDoc._id } },
    ),
  );

// Pre-fetch children for all documents to avoid querying in the loop
const allChildren = db.areas.aggregate([
  { $match: { parent: { $exists: true } } },
  { $group: { _id: "$parent", children: { $push: "$_id" } } }
]).toArray();

// hold a reference to the children in memory
const childrenMap = allChildren.reduce((map, item) => {
  map[item._id] = item.children;
  return map;
}, {});

// This stage will take a WHILE
db.areas.find().forEach((doc) => {
  // Perform a $graphLookup aggregation to get the full ancestor path for our target
  const pathDocs = db.areas.aggregate([
    {
      $match: { _id: doc._id },
    },
    {
      $graphLookup: {
        from: "areas",
        startWith: "$parent",
        connectFromField: "parent",
        connectToField: "_id",
        as: "ancestorPath",
        depthField: "depth",
      },
    },
    {
      $unwind: "$ancestorPath",
    },
    {
      $sort: { "ancestorPath.depth": -1 },
    },
    {
      $group: {
        _id: "$_id",
        ancestors: { $push: '$ancestorPath' }
      },
    },
  ]).toArray();

  const embeddedRelations = {
    children: childrenMap[doc._id] || [],
    // map out the ancestors of this doc (terminating at the current node for backward-compat reasons)
    // We take out the relevant data we would like to be denormalized.
    ancestors: [...(pathDocs[0]?.ancestors ?? []), doc].map(i => ({
      _id: i._id,
      name: i.area_name,
      uuid: i.metadata.area_id
    }))
  };

  if (embeddedRelations.ancestors.map(i => i.name).join(",") !== doc.pathTokens.join(",")) {
    throw `Path tokens did not match (${embeddedRelations.ancestors.map(i => i.name)} != ${doc.pathTokens})`;
  }

  if (embeddedRelations.ancestors.map(i => i.uuid).join(',') !== doc.ancestors) {
    throw `Ancestors did not match (${embeddedRelations.ancestors.map(i => i.uuid)} != ${doc.ancestors})`;
  }


  // Use bulkWrite for efficient updates
  db.areas.updateOne(
    { _id: doc._id },
    { $set: { embeddedRelations } }
  );
});

print("Removing old fields.");

// Remove the unneeded values since all ops have run without raising an assertion issue
db.areas.updateMany({}, {
  $unset: { children: "", pathTokens: "", ancestors: "" },
});

printjson(db.areas.createIndex({ parent: 1 }))
printjson(db.areas.createIndex({ 'embeddedRelations.children': 1 }))
printjson(db.areas.createIndex({ 'embeddedRelations.ancestors._id': 1 }))
printjson(db.areas.createIndex({ 'embeddedRelations.ancestors.uuid': 1 }))
printjson(db.areas.createIndex({ 'embeddedRelations.ancestors.name': 1 }))

printjson(db.areas.createIndex({ 'embeddedRelations.ancestors._id': 1, 'embeddedRelations.ancestors.name': 1 }))


//  https://www.mongodb.com/docs/v6.2/reference/method/db.collection.createIndex/#create-an-index-on-a-multiple-fields
//  > The order of fields in a compound index is important for supporting sort() operations using the index.
// It is not clear to me if there is a $lookup speed implication based on the direction of the join.
printjson(db.areas.createIndex({ parent: 1, _id: 1 }))
