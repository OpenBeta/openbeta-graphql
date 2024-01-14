#!/bin/bash

if [ -z ${GITHUB_ACCESS_TOKEN} ]
then
  echo "GITHUB_ACCESS_TOKEN not defined."
  exit 1
fi

echo "cloning openbeta-export repository"
git clone --depth 1 --branch production https://ob-bot-user:${GITHUB_ACCESS_TOKEN}@github.com/OpenBeta/openbeta-export || exit 1
git config user.name "db-export-bot"
git config user.email "db-export-bot@noreply"
cd ..

echo "start exporting CRAG data..."
yarn export-crags

echo "... finished export. Committing data..."

git add -A
git commit -am "export crag data"
git push origin production
