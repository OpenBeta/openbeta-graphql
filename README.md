Build status: ![Build](https://gitlab.com/openbeta/openbeta-graphql/badges/develop/pipeline.svg) [![License](https://img.shields.io/github/license/openbeta/graphql-api?style=flat-square)](./LICENSE)

# What is this?

OpenBeta GraphQL API allows other applications to access the climbing route catalog using any standard GraphQL clients.
 
**Endpoint**: https://api.openbeta.io

You can use any online GraphQL [playgrounds](https://graphiql-online.com) to explore the API.

> [Learn more about GraphQL](https://graphql.org)

# Queries

Get all sub-areas of Smith Rock

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

# License

AGPL