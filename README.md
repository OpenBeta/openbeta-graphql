[![Build](https://gitlab.com/openbeta/openbeta-graphql/badges/develop/pipeline.svg)](https://gitlab.com/openbeta/openbeta-graphql/-/pipelines) [![License](https://img.shields.io/github/license/openbeta/openbeta-graphql?style=flat-square)](./LICENSE)
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-9-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

# Climbing Route Catalog API 

### What is this?

OpenBeta Graph API allows other applications to access the [OpenBeta climbing database](https://openbeta.io) using any standard GraphQL clients.
 
**Endpoint**: 
- Production: https://api.openbeta.io
- Development: https://stg-api.openbeta.io

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
- [Node.js](https://nodejs.org) (v16.14.0 or later)
- [yarn](https://yarnpkg.com/getting-started/install)


0. Add '127.0.0.1 mongodb' entry to your `/etc/hosts` file (or C:\Windows\System32\drivers\etc\hosts on Windows)

```bash
127.0.0.1       mongodb
```

1.  Launch **mongodb** dev stack: database server and mongo-express (web-based admin console for mongo):

```
docker compose up -d
```

2. Seed the development database

```bash
yarn install
yarn refresh-db   # download USA data files locally and import
yarn update-stats      # update statistics
```

3. Start the GraphQL server
```bash
yarn serve
```

### Troubleshooting

- Fix "permissions on /opt/keyfile/keyfile are too open" error
  This error appears because the keyfile is required to be read-only

  ```bash
  chmod 400 keyfile
  ```

- Fix "error opening file: /opt/keyfile/keyfile: bad file" error
  This may appear after you update the keyfile to read-only access. The file needs to be owned by the same owner of the mongodb process

  ```bash
  chown 999:999 keyfile
  ```

### Tips

- Browse the database: http://localhost:8081

- GraphQL online playground: https://graphiql-online.com/

- Full stack development

  Connect your [frontend](https://github.com/OpenBeta/open-tacos) dev env to this local server
  ```bash
  # Run this in open-tacos project
  yarn dev-local
  ```

- Make sure to include `.js` when importing other files:
  ```
  import { getClimbModel } from '../db/ClimbSchema.js'
  ...
  ``
  Read the [background info](https://github.com/microsoft/TypeScript/issues/40878).

- Advanced database commands:

  ```bash
  # Download & import USA data files.  Also create all other countries.
  yarn refresh-db full #  Remove 'full' to import only a small dataset

  # Re-import USA from previously downloaded data files (cache dir: ./tmp)
  # Note: this command will drop and recreate the 'areas' and 'climbs' collection.
  yarn seed-usa

  # Add all countries (except for USA)
  yarn add-countries

  # Update area statistics (can be rerun as needed)
  yarn update-stats
  ```

- MongoDB playground: https://mongoplayground.net/

### Questions?

This project is under active development.  Join us on [Discord](https://discord.gg/xcWha22BhT)!

### License

The source code is licensed under the [Affero GPL v3.0 license](./LICENSE).

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gibboj"><img src="https://avatars.githubusercontent.com/u/2992272?v=4?s=100" width="100px;" alt="Kendra Gibbons"/><br /><sub><b>Kendra Gibbons</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=gibboj" title="Code">💻</a> <a href="#ideas-gibboj" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://ukclimbing.com"><img src="https://avatars.githubusercontent.com/u/677264?v=4?s=100" width="100px;" alt="Paul Phillips"/><br /><sub><b>Paul Phillips</b></sub></a><br /><a href="#ideas-pau1phi11ips" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/admanny"><img src="https://avatars.githubusercontent.com/u/31676895?v=4?s=100" width="100px;" alt="admanny"/><br /><sub><b>admanny</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=admanny" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CocoisBuggy"><img src="https://avatars.githubusercontent.com/u/64557383?v=4?s=100" width="100px;" alt="Colin Gale"/><br /><sub><b>Colin Gale</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=CocoisBuggy" title="Code">💻</a> <a href="#ideas-CocoisBuggy" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Downster"><img src="https://avatars.githubusercontent.com/u/24400646?v=4?s=100" width="100px;" alt="Brendan Downing"/><br /><sub><b>Brendan Downing</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=Downster" title="Code">💻</a> <a href="#ideas-Downster" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DarrenZLew"><img src="https://avatars.githubusercontent.com/u/26758226?v=4?s=100" width="100px;" alt="Darren Lew"/><br /><sub><b>Darren Lew</b></sub></a><br /><a href="#ideas-DarrenZLew" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=DarrenZLew" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vednus"><img src="https://avatars.githubusercontent.com/u/2602014?v=4?s=100" width="100px;" alt="Sundev"/><br /><sub><b>Sundev</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=Vednus" title="Code">💻</a> <a href="#ideas-Vednus" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://siman4457.github.io"><img src="https://avatars.githubusercontent.com/u/28658492?v=4?s=100" width="100px;" alt="Siman Shrestha"/><br /><sub><b>Siman Shrestha</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=siman4457" title="Code">💻</a> <a href="#ideas-siman4457" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.michaelreichenbach.de"><img src="https://avatars.githubusercontent.com/u/755327?v=4?s=100" width="100px;" alt="Silthus"/><br /><sub><b>Silthus</b></sub></a><br /><a href="#ideas-Silthus" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=Silthus" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
