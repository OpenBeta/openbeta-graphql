[![Build](https://gitlab.com/openbeta/openbeta-graphql/badges/develop/pipeline.svg)](https://gitlab.com/openbeta/openbeta-graphql/-/pipelines) [![License](https://img.shields.io/github/license/openbeta/openbeta-graphql?style=flat-square)](./LICENSE)
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-15-orange.svg?style=flat-square)](#contributors-)
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
  areas(filter: {area_name: {match: "Smith Rock"}}) {
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
    ]
  }
}
```

### Development
#### Requirements:

- [Docker](https://docs.docker.com/get-docker)
- [Node.js](https://nodejs.org) (v16.14.0 or later)
- [yarn](https://yarnpkg.com/getting-started/install)
- `mongorestore` command-line utility (you have to install the entire [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation/)).


0. Add '127.0.0.1 mongodb' entry to your `/etc/hosts` file (or C:\Windows\System32\drivers\etc\hosts on Windows)

```bash
127.0.0.1       mongodb
```

1.  Launch **mongodb** dev stack: database server and mongo-express (web-based admin console for mongo):

```
docker compose up -d
```

2. Seed your local database with data from staging environment

```bash
yarn install
yarn seed-db   # May take a few minutes to download a large database file
```

3. Start the GraphQL server
```bash
yarn serve
```

#### Navigating the codebase
These links explain the structure and key abstractions of our codebase. It's a good place to start before you go spelunking in the code.
 - [Layers](documentation/layers.md). 
 - [Testing](documentation/testing.md). 

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

- Bypassing auth when developing locally

  Start up your local server with `yarn serve-dev` (instead of `yarn serve`)
  ```bash
  # Run this in open-tacos project
  yarn serve-dev
  ```

  This allows the current user to run any `Query` or `Mutation` (irrespective of the current user’s UUID)
  
  (How it works: `auth/middleware.ts` and `auth/permissions.ts` are conditionally swapped out on server initialization (`server.ts`), based on whether the env var `LOCAL_DEV_BYPASS_AUTH` is set)

- Full stack development

  Connect your [frontend](https://github.com/OpenBeta/open-tacos) dev env to this local server
  ```bash
  # Run this in open-tacos project
  yarn dev-local
  ```

- Make sure to include `.js` when importing other files:
  ```javascript
  ...
  import { getClimbModel } from '../db/ClimbSchema.js'  // .js is required
  ...
  ```
  Why?  See [this issue](https://github.com/microsoft/TypeScript/issues/40878) for an explanation.

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
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/bradleyDean"><img src="https://avatars.githubusercontent.com/u/10867313?v=4?s=100" width="100px;" alt="Bradley Lignoski"/><br /><sub><b>Bradley Lignoski</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=bradleyDean" title="Code">💻</a> <a href="#ideas-bradleyDean" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://kaomorphism.com"><img src="https://avatars.githubusercontent.com/u/3641356?v=4?s=100" width="100px;" alt="zkao"/><br /><sub><b>zkao</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=zichongkao" title="Code">💻</a> <a href="#ideas-zichongkao" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://nathan.musoke.ca"><img src="https://avatars.githubusercontent.com/u/16665084?v=4?s=100" width="100px;" alt="Nathan Musoke"/><br /><sub><b>Nathan Musoke</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=musoke" title="Code">💻</a> <a href="#ideas-musoke" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://yichenhuang.me"><img src="https://avatars.githubusercontent.com/u/8950053?v=4?s=100" width="100px;" alt="Bill Huang"/><br /><sub><b>Bill Huang</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=billykeyss" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/l4u532"><img src="https://avatars.githubusercontent.com/u/88317742?v=4?s=100" width="100px;" alt="Klaus"/><br /><sub><b>Klaus</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=l4u532" title="Code">💻</a> <a href="#ideas-l4u532" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/enapupe"><img src="https://avatars.githubusercontent.com/u/291082?v=4?s=100" width="100px;" alt="Iacami Gevaerd"/><br /><sub><b>Iacami Gevaerd</b></sub></a><br /><a href="https://github.com/OpenBeta/openbeta-graphql/commits?author=enapupe" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
