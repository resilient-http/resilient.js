#!/bin/bash

./node_modules/.bin/http-server -p $1 > /dev/null &
echo $! > .server.pid

./node_modules/.bin/stubby -s 8882 -d ./test/fixtures/mocks.yaml > /dev/null &
echo $! > .stubby.pid

./node_modules/.bin/mocha-phantomjs -s localToRemoteUrlAccessEnabled=true -s webSecurityEnabled=false --reporter spec --ui bdd http://localhost:8888/test/runner.html?phantom

kill -9 `cat .server.pid | head -n 1`
kill -9 `cat .stubby.pid | head -n 1`
rm -rf .*.pid
