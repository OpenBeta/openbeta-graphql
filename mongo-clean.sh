#!/bin/bash

docker compose down

# MongoDb container won't run initializing scripts if there's
# already a data volume.   
docker volume rm openbeta-graphql_opentacos_mongodb_data --force

docker compose up -d
