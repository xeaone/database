#!/bin/bash

FIRESTORE_PROJECT="echos-344816" \
FIRESTORE_KEY=`cat ../FirestoreKey.json` \
deno run --allow-all test.ts

