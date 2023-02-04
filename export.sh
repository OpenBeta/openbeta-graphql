#!/bin/bash

echo "cloning openbeta-export repository"
git clone --depth 1 --branch production git@github.com:OpenBeta/openbeta-export.git

echo "start exporting database..."
yarn export:json:full --output openbeta-export

echo "... finished export. Committing data..."

cd openbeta-export || exit 1

git add -A
git commit -am "export openbeta data"
git push origin production