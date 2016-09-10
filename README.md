# koa-session-minimal

[![Build Status](https://travis-ci.org/longztian/koa-session-minimal.svg?branch=master)](https://travis-ci.org/longztian/koa-session-minimal)

Minimal implementation of session middleware for Koa 2. Inspired by and compatible with [koa-generic-session](https://github.com/koajs/generic-session). It is a re-write of generic-session with its essential functionality in es6.

This middleware works for Koa v2. it also support existing session stores for [koa-generic-session](https://github.com/koajs/generic-session) (via the `co` wrapper). It has the same runtime requirement as Koa v2:
- `--harmony` option is needed for for node 4 and 5
- `transform-async-to-generator` plugin is needed for babel

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

app.use(async ctx => {
  ctx.body = ctx.session.count
})

app.listen(3000)
```
