#!/bin/bash

if [ -z ${GITHUB_ACCESS_TOKEN} ]
then
  echo "GITHUB_ACCESS_TOKEN not defined."
  exit 1
fi

echo "start exporting CRAG data..."
yarn export-crags

ZIP_FILE=crags.geojson.gz

tar -czf ${ZIP_FILE} crags.geojson crag-groups.geojson

echo "... finished export. Committing data..."

echo "cloning openbeta-export repository"
git clone --depth 1 --branch production https://ob-export-user:${GITHUB_ACCESS_TOKEN}@github.com/OpenBeta/openbeta-export.git || exit 1

cd openbeta-export
git config user.name "ob-export-user"
git config user.email "db-export-bot@noreply"

mv ../${ZIP_FILE} .

git add -A
git commit -am "export crag data"
git push origin production
