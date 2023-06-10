# This script rebuilds your local database with
# a copy of OpenBeta staging database.
#
#!/bin/bash

FILE_NAME="openbeta-stg-db.tar.gz"
REMOTE_FILE="https://storage.googleapis.com/openbeta-dev-dbs/$FILE_NAME"

echo "Downloading db file(s)..."
#wget --content-disposition $REMOTE_FILE

rm -rf ./db-dumps/staging/openbeta

tar xzf $FILE_NAME

. .env

connStr="${MONGO_SCHEME}://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGO_SERVICE}/${MONGO_DBNAME}?authSource=${MONGO_AUTHDB}&tls=${MONGO_TLS}&replicaSet=${MONGO_REPLICA_SET_NAME}"

mongorestore --uri "$connStr" -d=${MONGO_DBNAME} --gzip --drop ./db-dumps/staging/openbeta

