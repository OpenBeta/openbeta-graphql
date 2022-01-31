#!/bin/bash
rm -rf tmp
mkdir tmp
cd tmp

GITHUB="https://raw.githubusercontent.com/OpenBeta/climbing-data/next"

wget --content-disposition \
  ${GITHUB}/openbeta-routes-northwest.zip
wget --content-disposition \
  ${GITHUB}/openbeta-routes-mountain2.zip

unzip '*.zip'

cd ..
export CONTENT_BASEDIR=./tmp

yarn seed-usa
