#!/bin/bash

if [ -z $1 ]
then
  echo "Missing migration file"
  exit 1
fi

. .env

connStr="${MONGO_SCHEME}://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGO_SERVICE}/${MONGO_DBNAME}?authSource=${MONGO_AUTHDB}&tls=${MONGO_TLS}&replicaSet=${MONGO_REPLICA_SET_NAME}"

mongo "$connStr" $1
