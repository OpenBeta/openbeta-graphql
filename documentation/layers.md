# Layers

## Overview
One way to think of our backend is comprising three layers wrapping the raw data sitting in Mongo DB.
1. GraphQL
2. Datasources
3. Models

Incoming data (API requests) pass through GraphQL > Datasource > Model and then the resulting data exit in reverse order from Model > Datasource > GraphQL.

When you change our data model, eg adding a new field to a climb object, you should expect to update each of the three layes as well.

## GraphQL
The outermost GraphQL layer that receives API calls. Our big integration tests (see [Testing](documentation/testing.md)) call this layer.

Code is in `src/graphql`.

## Datasources
The middle Mongoose datastore objects that expose commands to the GraphQL resolvers. Mongoose is our MongoDB NodeJS ORM. Our small integration tests test this layer down.

Code is in `src/model`.

## Models
The inner Mongoose models/schemas that represent how data is stored in the MongoDB.

Code is in `src/db/`