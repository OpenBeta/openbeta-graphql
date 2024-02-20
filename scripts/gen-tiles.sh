#!/bin/bash
# Generate map tiles from geojson exports
# See also https://github.com/felt/tippecanoe

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

. ${SCRIPT_DIR}/../.env
. ${SCRIPT_DIR}/../.env.local

echo "Generating crags tiles file"
tippecanoe --force -o ${MAPTILES_WORKING_DIR}/crags.mbtiles -l crags -n "Crags"  -zg ${MAPTILES_WORKING_DIR}/crags.*.geojson

echo "Generating crag group tiles file"
tippecanoe --force -o ${MAPTILES_WORKING_DIR}/crag-groups.mbtiles -l crag-groups -n "Crag groups"  -zg ${MAPTILES_WORKING_DIR}/crag-groups.geojson

exit $?