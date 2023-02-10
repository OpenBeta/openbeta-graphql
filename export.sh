#!/bin/bash

if [ -z ${GITHUB_ACCESS_TOKEN} ]
then
  echo "GITHUB_ACCESS_TOKEN var not defined."
  exit 1
fi

echo "cloning openbeta-export repository"
git clone --depth 1 --branch production https://${GITHUB_ACCESS_TOKEN}@github.com/OpenBeta/openbeta-export || exit 1
cd openbeta-export
git config user.name "db-export-bot"
git config user.email "db-export-bot@noreply"
cd ..

echo "start exporting database..."
yarn export:json:full --output openbeta-export

echo "... finished export. Committing data..."

cd openbeta-export || exit 1

git add -A
git commit -am "export openbeta data"
git push origin production
