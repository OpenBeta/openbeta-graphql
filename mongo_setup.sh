#!/bin/bash
echo "sleeping for 10 seconds"
sleep 10

echo mongo_setup.sh time now: `date +"%T" `
mongosh --username "${MONGO_INITDB_ROOT_USERNAME}" --password "${MONGO_INITDB_ROOT_PASSWORD}" --host mongodb:27017 <<EOF
 var cfg = {
   "_id": "rs0",
   "version": 1,
   "members": [
     {
       "_id": 0,
       "host": "mongodb:27017",
       "priority": 2
     }
   ]
 };
 rs.initiate(cfg);
EOF