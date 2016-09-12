# koa-session-minimal

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![codecov][codecov-image]][codecov-url]


Minimal implementation of session middleware for Koa 2. Inspired by and compatible with [koa-generic-session](https://github.com/koajs/generic-session). It is a re-write of `koa-generic-session` with its essential functionalities, with around 100 lines of code in ES6.

This is a native Koa 2 middleware. It supports existing session stores (via the `co` wrapper) for `koa-generic-session`. It can be used as a drop-in replacement for `koa-generic-session` in Koa 2.


## Installation

```shell
$ npm install koa-session-minimal
```


## Minimum features and storage usage

This middleware guarantees the following:
- A session only contains data populated via `ctx.session` object by other middlewares. It is an empty object by default.
  - No cookie and storage record will be generated unless session data gets populated
  - It will not store cookie info in session store (try to resolve [this concern](https://github.com/koajs/generic-session/issues/72)).
- Only store non-empty session. Only set/update the SID cookie and flush backend storage when session data has been changed.
  - When `ctx.session` gets updated (becomes a non-empty object), cookie and storage will be updated with the new data and new expiration time (`maxAge`, `ttl`).
  - When `ctx.session` gets cleared ( `= {}` or `null` ), cookie and storage data will get deleted.
  - If a session has not been updated within `maxAge`, its data will be expired.
- Only expose minimum public interfaces and configuration options
  - Cookie options: `maxAge`, `path`, `domain`, `secure`, `httpOnly`
  - Session interfaces: `session`, `sessionHandler { regenerateId(), setMaxAge() }`
  - Store interfaces: `get()`, `set()`, `destroy()`


## Usage

```javascript
const Koa = require('koa')
const session = require('koa-session-minimal')
const redisStore = require('koa-redis')

const app = new Koa()

app.use(session({
  store: redisStore(),
}))

// count middleware, increment when url = /add
app.use(async (ctx, next) => {
  ctx.session.count = ctx.session.count || 0
  if (ctx.path === '/add') ctx.session.count++

  await next()

  ctx.body = ctx.session.count
})

app.listen(3000)
```


## Interfaces

- session data via `ctx.session` (the same way as `koa-generic-session`)
- session methods via `ctx.sessionHandler`
  - `regenerateId()`: regenerate session id
  - `setMaxAge(ms)`: update session's `maxAge`, only take effect when session data has been changed


## Options

- `key`: session cookie name and store key prefix
- `store`: session store
- `cookie`: cookie options, only supports `maxAge`, `path`, `domain`, `secure`, `httpOnly` (see option details in [`cookies`](https://github.com/pillarjs/cookies) module)


## Session expiration

Default session has settings `cookie.maxAge = 0` and `ttl = ONE_DAY`, means that this session will be expired in one of the following circumstances:
- A user close the browser window (transient cookie expires)
- Session data hasn't been updated within `ONE_DAY` (storage expires)

With settings that `cookie.maxAge > 0`, `ttl` will be always the same as `maxAge`.

When session data gets updated, middlewares can update the `maxAge` by calling `sessionHandler.setMaxAge()`. Then the session's expiration time will be extended with the new `maxAge` value.


## Session security

Middlewares are recommended to call `sessionHandler.regenerateId()` during authentication state change (login/logout). This middleware provides the essential interface, It will be other middleware's decision on when and how often they want to roll the session id.


## Session store *(copied from `koa-generic-session`)*

You can use any other store to replace the default MemoryStore, it just needs to follow this api:

- `get(sid)`: get session object by sid
- `set(sid, sess, ttl)`: set session object for sid, with a ttl (in ms)
- `destroy(sid)`: destroy session for sid

the api needs to return a Promise, Thunk, generator, or an async function.


## Stores presented *(copied from `koa-generic-session`, tested with `koa-redis`)*

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
[downloads-image]: http://img.shields.io/npm/dm/koa-session-minimal.svg
[downloads-url]: https://www.npmjs.com/package/koa-session-minimal
[travis-image]: https://travis-ci.org/longztian/koa-session-minimal.svg?branch=master
[travis-url]: https://travis-ci.org/longztian/koa-session-minimal
[codecov-image]: https://codecov.io/gh/longztian/koa-session-minimal/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/longztian/koa-session-minimal
