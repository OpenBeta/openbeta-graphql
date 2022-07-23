#!/bin/bash
# Download seed files and start seeding
# Syntax: ./refresh-db.sh [full]
# Specify 'full' to download the entire data set.

rm -rf tmp
mkdir tmp
cd tmp

GITHUB="https://raw.githubusercontent.com/OpenBeta/climbing-data/next"

wget --content-disposition \
  ${GITHUB}/openbeta-routes-westcoast.zip

if [[ "$1" == "full" ]]; 
then

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
fi

unzip '*.zip'

cd ..
export CONTENT_BASEDIR=./tmp

echo "NODE_OPTIONS=${NODE_OPTIONS}"
yarn seed-usa
