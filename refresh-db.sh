#!/bin/bash
git clone --depth 1 --branch develop \
    https://github.com/OpenBeta/opentacos-content.git

rm -rf opentacos-content/content/USA/Nevada
rm -rf opentacos-content/content/USA/Washington

export CONTENT_BASEDIR=./opentacos-content/content/USA/Oregon

node build/db/import/DataLoader.js
