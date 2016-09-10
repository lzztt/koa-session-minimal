# koa-session-minimal

[![NPM version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]

Minimal implementation of session middleware for Koa 2. Inspired by and compatible with [koa-generic-session](https://github.com/koajs/generic-session). It is a re-write of `koa-generic-session` with its essential functionalities, with around 100 lines of code in ES6.

This is a native Koa 2 middleware. It supports existing session stores (via the `co` wrapper) for `koa-generic-session`. It can be used as a drop-in replacement for `koa-generic-session` in Koa 2.

## Runtime Requirements

This is an `async` middleware thus has the same runtime requirements as Koa 2:
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

// update session count
app.use(async (ctx, next) => {
  ctx.session.count = ctx.session.count || 0
  ctx.session.count++
  await next()
})

// populate response body
app.use(ctx => {
  ctx.body = ctx.sessionHandler.getId() + ' : ' + ctx.session.count
})

app.listen(3000)
```

## Interfaces
- session data via `ctx.session` (the same way as `koa-generic-session`)
- session methods via `ctx.sessionHandler`
..- `getId()`: get session id
..- `regenerateId()`: regenerate session id
..- `setMaxAge(ms)`: update session's maxAge, only take effect when session data has been changed

## Options
  - `key`: session cookie name and store key prefix
  - `store`: session store
  - `cookie`: cookie options (see option details in `cookies` module)

## Session Store *(copied from `koa-generic-session`)*

You can use any other store to replace the default MemoryStore, it just needs to follow this api:

* `get(sid)`: get session object by sid
* `set(sid, sess, ttl)`: set session object for sid, with a ttl (in ms)
* `destroy(sid)`: destroy session for sid

the api needs to return a Promise, Thunk, generator, or an async function.

### Stores Presented *(copied from `koa-generic-session`, tested with `koa-redis`)*

- [koa-redis](https://github.com/koajs/koa-redis) to store your session data with redis.
- [koa-mysql-session](https://github.com/tb01923/koa-mysql-session) to store your session data with MySQL.
- [koa-generic-session-mongo](https://github.com/freakycue/koa-generic-session-mongo) to store your session data with MongoDB.
- [koa-pg-session](https://github.com/TMiguelT/koa-pg-session) to store your session data with PostgreSQL.
- [koa-generic-session-rethinkdb](https://github.com/KualiCo/koa-generic-session-rethinkdb) to store your session data with ReThinkDB.
- [koa-sqlite3-session](https://github.com/chichou/koa-sqlite3-session) to store your session data with SQLite3.

# License

  MIT

[npm-image]: https://img.shields.io/npm/v/koa-session-minimal.svg
[npm-url]: https://www.npmjs.com/package/koa-session-minimal
[travis-image]: https://travis-ci.org/longztian/koa-session-minimal.svg?branch=master
[travis-url]: https://travis-ci.org/longztian/koa-session-minimal
