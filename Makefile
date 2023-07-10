all: build node

build: package-lock.json
	esbuild --bundle --outdir=site src/index.tsx

dist: package-lock.json
	esbuild --bundle --minify --outdir=site src/index.tsx

node: package-lock.json
	tsc

serve: package-lock.json
	esbuild --bundle --outdir=site --servedir=site src/index.tsx

package-lock.json: package.json
	rm -rf node_modules package-lock.json
	npm install

clean:
	rm -rf */*.js

distclean:
	git clean -fXd
