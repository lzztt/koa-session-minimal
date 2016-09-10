const uid = require('uid-safe')
const deepEqual = require('deep-equal')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const ONE_DAY = 24 * 3600 * 1000 // one day in milliseconds

const deleteSession = (ctx, key, ckOption, store, sid) => {
  const deleteOption = Object.assign({}, ckOption)
  delete deleteOption.maxAge
  ctx.cookies.set(key, null, deleteOption)
  store.destroy(`${key}:${sid}`)
}

const saveSession = (ctx, key, ckOption, store, sid) => {
  const ttl = ckOption.maxAge > 0 ? ckOption.maxAge : ONE_DAY
  ctx.cookies.set(key, sid, ckOption)
  store.set(`${key}:${sid}`, ctx.session, ttl)
}

module.exports = ({ key = 'koa:sess', store = new MemoryStore(), cookie = null } = {}) => {
  const sessionStore = new Store(store)

  return async (ctx, next) => {
    // setup cookie options
    const ckOption = {
      maxAge: 0, // default to use session cookie
      path: '/',
      secure: false,
      httpOnly: true,
    }
    if (cookie && typeof cookie === 'object') {
      Object.assign(ckOption, cookie)
    }
    Object.assign(ckOption, {
      overwrite: true, // overwrite previous session cookie changes
      signed: false, // disable signed option
    })
    if (!(ckOption.maxAge >= 0)) ckOption.maxAge = 0

    // initialize session id and data
    const cookieSid = ctx.cookies.get(key)

    let sid = cookieSid
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await sessionStore.get(`${key}:${sid}`)
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {}
      }
    }

    const sessionClone = JSON.parse(JSON.stringify(ctx.session))

    // expose session handler to ctx
    ctx.sessionHandler = {
      getId: () => sid,
      regenerateId: () => {
        sid = uid.sync(24)
      },
      setMaxAge: ms => {
        ckOption.maxAge = ms >= 0 ? ms : 0
      },
    }

    await next()

    const sessionHasData = ctx.session && Object.keys(ctx.session).length

    if (sid !== cookieSid) { // a new session id
      // clean old session
      if (cookieSid) deleteSession(ctx, key, ckOption, sessionStore, cookieSid)

      // save new session
      if (sessionHasData) saveSession(ctx, key, ckOption, sessionStore, sid)
    } else { // an existing session
      // data has not been changed
      if (deepEqual(ctx.session, sessionClone)) return

      // update session data
      if (sessionHasData) {
        saveSession(ctx, key, ckOption, sessionStore, sid)
      } else {
        deleteSession(ctx, key, ckOption, sessionStore, sid)
      }
    }
  }
}
