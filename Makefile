.DEFAULT_GOAL := dist
.PHONY: lint test test-cov test-travis clean

lint:
	eslint src test example

test:
	mocha --compilers js:babel-register --bail test

test-cov:
	rm -rf build coverage && \
		babel --plugins='external-helpers' src -d build -s && \
		babel-external-helpers -l asyncToGenerator > build/helper.js && \
		babel test -d build/test -s && \
		sed -i -e 's@../src@..@' -e "s@describe('@describe('cov: @" \
			-e 's@describe(`@describe(`cov: @' build/test/*.test.js && \
		istanbul cover -x build/helper.js -- \
		./node_modules/.bin/_mocha --require build/helper.js --bail \
		build/test

test-travis:
	rm -rf build coverage && \
		babel --plugins='external-helpers' src -d build -s && \
		babel-external-helpers -l asyncToGenerator > build/helper.js && \
		babel test -d build/test -s && \
		sed -i -e 's@../src@..@' -e "s@describe('@describe('cov: @" \
			-e 's@describe(`@describe(`cov: @' build/test/*.test.js && \
		istanbul cover -x build/helper.js --report lcovonly -- \
		./node_modules/.bin/_mocha --require build/helper.js --bail \
		build/test

dist: src/*.js test/*.js
	rm -rf dist && \
		babel src -d dist --no-comments && \
		babel test -d dist/test && \
		sed -i -e 's@../src/session@../..@' -e 's@../src/@../@' \
			-e "s@describe('@describe('dist: @" -e 's@describe(`@describe(`dist: @' \
			dist/test/*.test.js && \
		mocha dist/test && \
		rm -rf dist/test

clean:
	rm -rf dist build coverage
