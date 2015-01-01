VERSION = 0.2.24
BROWSERIFY = node ./node_modules/.bin/browserify
MOCHA = ./node_modules/.bin/mocha
UGLIFYJS = ./node_modules/.bin/uglifyjs
CUCUMBER = ./node_modules/.bin/cucumber-js
STUBBY = ./node_modules/.bin/stubby
KARMA = ./node_modules/karma/bin/karma
MOCHA_PHANTOM = ./node_modules/.bin/mocha-phantomjs -s localToRemoteUrlAccessEnabled=true -s webSecurityEnabled=false
BANNER = "/*! resilient - v$(VERSION) - MIT License - https://github.com/resilient-http/resilient.js */"

define release
	VERSION=`node -pe "require('./bower.json').version"` && \
	NEXT_VERSION=`node -pe "require('semver').inc(\"$$VERSION\", '$(1)')"` && \
	node -e "\
		var j = require('./component.json');\
		j.version = \"$$NEXT_VERSION\";\
		var s = JSON.stringify(j, null, 2);\
		require('fs').writeFileSync('./component.json', s);" && \
	node -e "\
		var j = require('./bower.json');\
		j.version = \"$$NEXT_VERSION\";\
		var s = JSON.stringify(j, null, 2);\
		require('fs').writeFileSync('./bower.json', s);" && \
	git commit -am "release $$NEXT_VERSION" && \
	git tag "$$NEXT_VERSION" -m "Version $$NEXT_VERSION"
endef

default: all
all: test
browser: banner browserify uglify
test: browser mocha test-phantom cucumber
test-phantom: mock-server-stop mock-server mocha-phantom mock-server-stop
test-browser: mock-server-stop mock-server karma mock-server-stop

banner:
	@echo $(BANNER) > resilient.js

browserify:
	$(BROWSERIFY) \
		--exports require \
		--standalone resilient \
		--ignore request \
		--entry ./lib/index.js >> ./resilient.js

uglify:
	$(UGLIFYJS) resilient.js --mangle --preamble $(BANNER) --source-map resilient.min.js.map --source-map-url http://cdn.rawgit.com/resilient-http/resilient.js/$(VERSION)/resilient.min.js.map > resilient.min.js

mocha:
	$(MOCHA) --reporter spec --ui tdd

mocha-phantom:
	$(MOCHA_PHANTOM) --reporter spec --ui bdd test/runner.html
	$(MAKE) mock-server-stop

cucumber:
	$(CUCUMBER) -f pretty -r features/support -r features/step_definitions

loc:
	wc -l resilient.js

mock-server:
	$(STUBBY) -d ./test/fixtures/mocks.yaml > /dev/null & echo $$! > .server.pid

mock-server-stop:
	[ -f .server.pid ] && kill -9 `cat .server.pid | head -n 1` && rm -f .server.pid || exit 0

karma:
	$(KARMA) start

karma-ci:
	$(KARMA) start --single-run --browsers Firefox

gzip:
	gzip -c resilient.min.js | wc -c

release:
	@$(call release, patch)

release-minor:
	@$(call release, minor)

publish: browser release
	git push --tags origin HEAD:master
