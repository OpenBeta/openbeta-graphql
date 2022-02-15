#!/bin/bash
rm -rf tmp
mkdir tmp
cd tmp

GITHUB="https://raw.githubusercontent.com/OpenBeta/climbing-data/next"

wget --content-disposition \
  ${GITHUB}/openbeta-routes-westcoast.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-mountains2.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-mountains1.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-ca.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-northeast.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-southeast.zip

wget --content-disposition \
  ${GITHUB}/openbeta-routes-midwest.zip

unzip '*.zip'

cd ..
export CONTENT_BASEDIR=./tmp

yarn seed-usa
