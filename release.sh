#!/bin/bash

cd "$(dirname "$0")"

set -e
set -x

if [ $(npm -v | head -c 1) -lt 5 ]; then
  echo "Releasing requires npm >= 5. Aborting.";
  exit 1;
fi;

if [ -n "$(git status --porcelain)" ]; then
  echo "Your git status is not clean. Aborting.";
  exit 1;
fi

./node_modules/.bin/lerna publish --exact "$@"
