[![Build](https://gitlab.com/openbeta/openbeta-graphql/badges/develop/pipeline.svg)](https://gitlab.com/openbeta/openbeta-graphql/-/pipelines) [![License](https://img.shields.io/github/license/openbeta/openbeta-graphql?style=flat-square)](./LICENSE)

# Climbing Route Catalog API 

### What is this?

OpenBeta GraphQL API allows other applications to access the [climbing route catalog](https://github.com/OpenBeta/opentacos-content) using any standard GraphQL clients.
 
**Endpoint**: https://api.openbeta.io

We recommend using an online [playground](https://graphiql-online.com) to explore the API.

> [Learn more about GraphQL](https://graphql.org)

### Example query

Get all sub-areas at Smith Rock

```graphql
query Example1 {
  areas(name: "Smith Rock") {
    area_name
    children {
      area_name
      metadata {
        lat
        lng
      }
    }
  }
}

# Result
{
  "data": {
    "areas": [
      {
        "area_name": "Smith Rock",
        "children": [
          {
            "area_name": "Aggro Gully",
            "metadata": {
              "lat": 44.36724,
              "lng": -121.14238
            }
          },
          {
            "area_name": "Angel Flight Crags",
            "metadata": {
              "lat": 44.5672,
              "lng": -122.1269
            }
          },
       ...
        ]
      }
  }
}
```

### Development
#### Requirements:

- [Docker](https://docs.docker.com/get-docker)
- [Node.js](https://nodejs.org) (v16 or later)
- [yarn](https://yarnpkg.com/getting-started/install)

#### Seed the development database

1.  Launch **mongodb** (the database) and **mongo-express** (the web-based admin console for mongo):

```
docker compose up -d
```

2.  Seed the database.  You should see "Done." without any errors.

```
yarn install
yarn refresh-db
```

Browse the database: http://localhost:8081

### Questions?

This project is under active development.  Join us on [Discord](https://discord.gg/xcWha22BhT)!

### License

The source code is licensed under the [Affero GPL v3.0 license](./LICENSE).
