# koa-session-minimal

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

Minimal implementation of session middleware for Koa 2. Inspired by and compatible with [koa-generic-session](https://github.com/koajs/generic-session). It is a re-write of generic-session with its essential functionality, with around 100 lines of code in es6.

This middleware works with Koa 2. It supports existing session stores for [koa-generic-session](https://github.com/koajs/generic-session) (via the `co` wrapper). It has the same runtime requirement as Koa 2:
- node version >= 4
- `--harmony` option is needed for for node 4 and 5
- `transform-async-to-generator` plugin is needed for babel

## Installation

```shell
$ npm install koa-session-minimal
```

## Usage

```javascript
const Koa = require('koa')
const session = require('koa-session-minimal')
const redisStore = require('koa-redis')

const app = new Koa()

app.use(session({
  store: redisStore(),
}))

app.use(async (ctx, next) => {
  ctx.session.count = ctx.session.count || 0
  ctx.session.count++
  await next()
})

app.use(ctx => {
  ctx.body = ctx.session.count
})

app.listen(3000)
```

# License

  MIT

[npm-image]: https://img.shields.io/npm/v/koa-session-minimal.svg
[npm-url]: https://www.npmjs.com/package/koa-session-minimal
[travis-image]: https://travis-ci.org/longztian/koa-session-minimal.svg?branch=master
[travis-url]: https://travis-ci.org/longztian/koa-session-minimal
