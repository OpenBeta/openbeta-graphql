# Rebuild your local database with a copy of OpenBeta staging database.
#
# To keep running time short, the script only downloads the remote 
# database dump file once.  Specify 'download' argument to force download.
#
# Syntax:
#   ./seed-db.sh [download]
#
#!/bin/bash

FILE_NAME="openbeta-stg-db.tar.gz"
REMOTE_FILE="https://storage.googleapis.com/openbeta-dev-dbs/$FILE_NAME"

if [[ ! -f ${FILE_NAME}  || ${1} == "download" ]]; then
  echo "Downloading db file(s)..."
  wget --content-disposition $REMOTE_FILE
fi

rm -rf ./db-dumps/staging/openbeta

tar xzf $FILE_NAME

. .env

connStr="${MONGO_SCHEME}://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGO_SERVICE}/${MONGO_DBNAME}?authSource=${MONGO_AUTHDB}&tls=${MONGO_TLS}&replicaSet=${MONGO_REPLICA_SET_NAME}"

mongorestore --uri "$connStr" -d=${MONGO_DBNAME} --gzip --drop ./db-dumps/staging/openbeta

