BROWSERIFY = node ./node_modules/browserify/bin/cmd.js
MOCHA = ./node_modules/.bin/mocha
UGLIFYJS = ./node_modules/.bin/uglifyjs
BANNER = "/*! resilient - v0.1 - MIT License - https://github.com/h2non/resilient */"
MOCHA_PHANTOM = ./node_modules/.bin/mocha-phantomjs
KARMA = ./node_modules/karma/bin/karma

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
test: browser mocha

banner:
	@echo $(BANNER) > resilient.js

browserify:
	$(BROWSERIFY) \
		--exports require \
		--standalone resilient \
		--entry ./src/resilient.js >> ./resilient.js

uglify:
	$(UGLIFYJS) resilient.js --mangle --preamble $(BANNER) --source-map resilient.min.js.map > resilient.min.js

mocha:
	$(MOCHA) --reporter spec --ui tdd ./test/server ./test/servers
	#bash ./test/run.sh 8888

loc:
	wc -l resilient.js

karma:
	$(KARMA) start

gzip:
	gzip -c resilient.js | wc -c

release:
	@$(call release, patch)

release-minor:
	@$(call release, minor)

publish: browser release
	git push --tags origin HEAD:master
