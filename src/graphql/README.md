# OpenBeta GQL

Some general patterns to follow when changing the schema are:

1. Use camelCase field names
2. Always document WHAT a piece of data is, and some way for devs to anticipate what the possible values are. Even if you think it's obvious.
3. Leverage recursive patterns EVERYWHERE. This is a strength of GQL that deserves utilization
4. One resolver, all relational data. No one should have to reach through multiple queries to get the data they need, that defeats the whole point of GQL. If the schema can express more data, then write it that way.

### Documentation, Documentation.

GraphQL is a language for expressing the possible data, and the relation to other data, of our service. Documentation helps us, and helps our collaborators. Critically, GraphQL does not care WHERE data comes from, you can make a front-end dev cry with joy by making schemas with clarity and documentation, even if that requires more work on your part.