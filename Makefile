BROWSERIFY = node ./node_modules/browserify/bin/cmd.js
MOCHA = ./node_modules/.bin/mocha
UGLIFYJS = ./node_modules/.bin/uglifyjs
BANNER = "/*! lil-resilient - v0.1 - MIT License - https://github.com/lil-js/http */"
MOCHA_PHANTOM = ./node_modules/.bin/mocha-phantomjs
KARMA = ./node_modules/karma/bin/karma

define release
	VERSION=`node -pe "require('./package.json').version"` && \
	NEXT_VERSION=`node -pe "require('semver').inc(\"$$VERSION\", '$(1)')"` && \
	node -e "\
		var j = require('./package.json');\
		j.version = \"$$NEXT_VERSION\";\
		var s = JSON.stringify(j, null, 2);\
		require('fs').writeFileSync('./package.json', s);" && \
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
browser: uglify
test: browser mocha

uglify:
	$(UGLIFYJS) resilient.js --mangle --preamble $(BANNER) --source-map resilient.min.js.map > resilient.min.js

mocha:
	bash ./test/run.sh 8888

loc:
	wc -l resilient.js

gzip:
	gzip -c resilient.js | wc -c

karma:
	$(KARMA) start

release:
	@$(call release, patch)

release-minor:
	@$(call release, minor)

publish: browser release
	git push --tags origin HEAD:master
