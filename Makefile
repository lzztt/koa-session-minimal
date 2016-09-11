lint:
	eslint lib test

test:
	mocha --compilers js:babel-register --bail test

test-cov:
	rm -rf cov coverage && \
		babel --plugins='external-helpers' lib -d cov && \
		babel-external-helpers -l asyncToGenerator > cov/helper.js && \
		babel test -d cov/test && \
		sed -i -e 's@../lib@..@' -e "s@describe('@describe('cov:@" cov/test/*.test.js && \
		istanbul cover -x cov/helper.js -- \
		./node_modules/.bin/_mocha --require cov/helper.js --bail \
		cov/test


test-travis:
	rm -rf cov coverage && \
		babel --plugins='external-helpers' lib -d cov && \
		babel-external-helpers -l asyncToGenerator > cov/helper.js && \
		babel test -d cov/test && \
		sed -i -e 's@../lib@..@' -e "s@describe('@describe('cov:@" cov/test/*.test.js && \
		istanbul cover -x cov/helper.js --report lcovonly -- \
		./node_modules/.bin/_mocha --require cov/helper.js --bail \
		cov/test

dist:
	rm -rf dist && \
		babel lib -d dist && \
		babel test -d dist/test && \
		sed -i -e 's@../lib/session@../..@' -e "s@describe('@describe('dist:@" dist/test/*.test.js && \
		mocha dist/test && \
		rm -rf dist/test

clean:
	rm -rf dist cov coverage

.PHONY: test
