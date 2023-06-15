# Testing
*Updated 2023-06-15*

## Overview
There are currently two broad classes of tests in this repo: Big integration tests and small ones. Both sets are integration tests because they validate long chains of functionality as opposed to single classes or functions (unit tests). 

The big set is called "big" because it is truly end-to-end. It posts GraphQL queries and checks their output, which is literally what the API does in production. The small set skips the GraphQL layer (you might want to read more about layers [here](documentation/layers.md)) and instead calls datasource functions directly.

## Big Integration Tests
These tests mock up a GraphQL backend, and make HTTP calls to it. Since these tests are so realistic, they are immensely protective, illustrative and confidence-building. Open-tacos developers can cut and paste the GraphQL queries in these tests and use them to build the frontend.

These tests are stored in `/src/__tests__/`. The setup code is in `/src/utils/testUtils.ts`. Note how most of the code is oriented around setting up and tearing down a GraphQL server and an in-memory Mongo DB.

We rely on `mongo-memory-server` (a node package) for the in-memory Mongo DB. By running it in memory, it is lightweight and easily setup during `beforeAll`. Early on, we were hampered by the fact that the standard Mongo server that `mongo-memory-server` offers doesn't support Mongo transactions, which we use extensively. This is why we wrote small integration tests which rely on a local instance of MongoDB. However, in 2021, the package started to offer an in-memory replset which does support Mongo transactions. From then on, we've been able to write big integration tests which set up a replset which supports everything we need to do.


## Small Integration Tests
These essentially test datasource functions. Eg. the key line in such a test could be `await users.createOrUpdateUserProfile(updater, input)`([Source](src/model/__tests__/UserDataSource.ts)). This tests the `createOrUpdateUserProfile` function of the `user` datasource. Datasources sit one layer below the GraphQL layer (another plug to read [Layers]((documentation/layers.md))). In `src/graphql/resolvers.ts`, you can see how the GraphQL layer calls datasource functions to resolve entities in the queries.

Other than their inability to test how the GraphQL layer resolves queries, the main shortcoming of these tests are their poor portability. To use them, you need to set up a Mongo DB locally for the tests to read and write from. This is why the the main [README](README.md) page gets developers to spin up a Docker instance and edit `/etc/hosts` mongod mappings.

In general, we should phase these out in favor of big integration tests. In case you need to debug them or, god forbid, write new ones, they reside in `/src/model/__tests__/`.
