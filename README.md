# koa-session-minimal

[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]
[![Build Status][travis-image]][travis-url]
[![codecov][codecov-image]][codecov-url]


Native Koa 2 session middleware, inspired by and compatible with [koa-generic-session](https://github.com/koajs/generic-session). This can be used as a drop-in replacement for `koa-generic-session` in Koa 2.

This rewrite implements `koa-generic-session`'s essential interfaces, with around 100 lines of code in ES6. It supports existing session stores for `koa-generic-session`.


## Minimum features and storage usage

This middleware guarantees the following:
- Minimum data generation and storage. No session data modification / pollution.
  - Neither a cookie nor a session store record is created unless session data gets populated by other middlewares.
  - Cookie options are not saved in the `ctx.session` object or session store (try to address [this concern](https://github.com/koajs/generic-session/issues/72)).
- Minimum updates on cookie and session store. Cookie and session store only get updated when session data has been changed.
  - When `ctx.session` gets updated (is a non-empty object), cookie and store data will be updated with new values and new expiration time (`maxAge`).
  - When `ctx.session` gets cleared ( `= {}` or `null` ), cookie and store data will be deleted.
  - If a session has not been updated within `maxAge`, its data will be expired.
- Minimum public interfaces and configuration options.
  - Cookie options: `maxAge`, `path`, `domain`, `secure`, `httpOnly`
  - Session interfaces: `session`, `sessionHandler { regenerateId() }`
  - Store interfaces: `get()`, `set()`, `destroy()`


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
  store: redisStore()
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


## Options

- `key`: session cookie name and store key prefix
- `store`: session store
- `cookie`: cookie options, can be an object (static cookie options) or a function that returns an object (dynamic cookie options). Only `maxAge`, `path`, `domain`, `secure`, `httpOnly` are supported as option keys (see option details in [`cookies`](https://github.com/pillarjs/cookies) module).


## Session expiration

Default session has settings `cookie.maxAge = 0` for cookie and `ttl = ONE_DAY` for session store, means that a session will be expired in one of the following circumstances:
- A user close the browser window (transient cookie ends)
- Session data hasn't been updated within `ONE_DAY` (storage expires)

With settings that `cookie.maxAge > 0`, the `ttl` for store data will be always the same as `maxAge`.


## Dynamic session expiration (cookie options)

When setting `cookie` option to a plain object, all sessions will use the same cookie options. If a function is assigned to `cookie`, cookie options will be dynamically calculated at each (non-empty) session's saving stage.
For example, you can use an arrow function to set different `maxAge` for user and guest sessions, as below:
```javascript
session({
  cookie: ctx => ({
    maxAge: ctx.session.user ? ONE_MONTH : 0
  })
})
```


## Session security

Middlewares are recommended to call `sessionHandler.regenerateId()` during authentication state change (login). This middleware provides the essential interface, It will be other middleware's decision on when and how often they want to roll the session id.

> NOTE: Below is mostly copied from `koa-generic-session`'s README, because the two middlewares share the same store interfaces. Any store that implements `koa-generic-session`'s store interfaces should also work with `koa-session-minimal`. `koa-redis` is tested as an example in `test/store_redis.test.js`

## Session store

You can use any other store to replace the default MemoryStore, it just needs to follow this api:

- `get(sid)`: get session object by sid
- `set(sid, sess, ttl)`: set session object for sid, with a ttl (in ms)
- `destroy(sid)`: destroy session for sid

the api needs to return a Promise, Thunk, generator, or an async function.


## Stores presented

- [koa-redis](https://github.com/koajs/koa-redis) to store your session data with redis.
- [koa-mysql-session](https://github.com/tb01923/koa-mysql-session) to store your session data with MySQL.
- [koa-generic-session-mongo](https://github.com/freakycue/koa-generic-session-mongo) to store your session data with MongoDB.
- [koa-pg-session](https://github.com/TMiguelT/koa-pg-session) to store your session data with PostgreSQL.
- [koa-generic-session-rethinkdb](https://github.com/KualiCo/koa-generic-session-rethinkdb) to store your session data with ReThinkDB.
- [koa-sqlite3-session](https://github.com/chichou/koa-sqlite3-session) to store your session data with SQLite3.
- [koa-generic-session-sequelize](https://github.com/natesilva/koa-generic-session-sequelize) to store your session data with the [Sequelize](http://docs.sequelizejs.com/) ORM.


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
