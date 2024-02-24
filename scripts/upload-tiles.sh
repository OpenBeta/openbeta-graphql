#!/bin/bash
# 1.  Generate pmtiles tiles from geojson exports
# 2.  Upload to S3-compatible storage
# See also https://github.com/felt/tippecanoe

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

set -a
. ${SCRIPT_DIR}/../.env 2> /dev/null
. ${SCRIPT_DIR}/../.env.local 2> /dev/null
set +a

# Define Cloudflare-R2 backend for rclone
S3_DEST=':s3,provider=Cloudflare,no_check_bucket=true,env_auth=true,acl=private:maptiles'

echo "------ Generating crags tiles file ------"
tippecanoe --force -o ${MAPTILES_WORKING_DIR}/crags.pmtiles -l crags -n "Crags" -zg ${MAPTILES_WORKING_DIR}/crags.*.geojson

echo "**Uploading to remote storage"
rclone copy ${MAPTILES_WORKING_DIR}/crags.pmtiles ${S3_DEST}

echo "------ Generating crag group tiles file ------"
tippecanoe --force -o ${MAPTILES_WORKING_DIR}/crag-groups.pmtiles -l crag-groups -n "Crag groups" -zg ${MAPTILES_WORKING_DIR}/crag-groups.geojson

echo "**Uploading to remote storage"
rclone copy ${MAPTILES_WORKING_DIR}/crag-groups.pmtiles ${S3_DEST}

exit $?
