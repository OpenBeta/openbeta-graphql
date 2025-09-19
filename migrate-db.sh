#!/bin/bash

if [ -z $1 ]
then
  echo "Missing migration file"
  exit 1
fi

if [ ! -f $1 ]
then
  echo "Specified migration file ($1) not found"
  exit 1
fi

. .env

connStr="${MONGO_SCHEME}://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGO_SERVICE}/${MONGO_DBNAME}?authSource=${MONGO_AUTHDB}&tls=${MONGO_TLS}&replicaSet=${MONGO_REPLICA_SET_NAME}"

# Determine whether `mongo` or `mongosh` is available
if command -v mongosh &> /dev/null; then
  mongoCmd="mongosh"
  elif command -v mongo &> /dev/null; then
  mongoCmd="mongo"
else
  echo "Neither mongosh nor mongo command found. Please install one of them."
  exit 1
fi

# Execute the chosen command with the connection string and migration file
"$mongoCmd" "$connStr" "$1"