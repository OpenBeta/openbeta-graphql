[![Build](https://gitlab.com/openbeta/openbeta-graphql/badges/develop/pipeline.svg)](https://gitlab.com/openbeta/openbeta-graphql/-/pipelines) [![License](https://img.shields.io/github/license/openbeta/openbeta-graphql?style=flat-square)](./LICENSE)
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

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

### Code Contributions

If you'd like to fix bugs or add a new feature to OpenBeta GraphQL API, please make sure you consult the [Contribution Guidelines](./CONTRIBUTING.md).

### License

The source code is licensed under the [Affero GPL v3.0 license](./LICENSE).

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/gibboj"><img src="https://avatars.githubusercontent.com/u/2992272?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Kendra Gibbons</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=gibboj" title="Code">💻</a> <a href="#ideas-gibboj" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!