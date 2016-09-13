const uid = require('uid-safe')
const deepEqual = require('deep-equal')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const ONE_DAY = 24 * 3600 * 1000 // one day in milliseconds

const deleteSession = (ctx, key, cookie, store, sid) => {
  const deleteOption = Object.assign({}, cookie)
  delete deleteOption.maxAge
  ctx.cookies.set(key, null, deleteOption)
  store.destroy(`${key}:${sid}`)
}

const saveSession = (ctx, key, cookie, store, sid) => {
  const ttl = cookie.maxAge > 0 ? cookie.maxAge : ONE_DAY
  ctx.cookies.set(key, sid, cookie)
  store.set(`${key}:${sid}`, ctx.session, ttl)
}

module.exports = options => {
  const opt = options || {}
  const key = opt.key || 'koa:sess'
  const store = new Store(opt.store || new MemoryStore())
  const defaultCookie = Object.assign({
    maxAge: 0, // default to use session cookie
    path: '/',
    secure: false,
    httpOnly: true,
  }, opt.cookie || {}, {
    overwrite: true, // overwrite previous session cookie changes
    signed: false, // disable signed option
  })
  if (!(defaultCookie.maxAge >= 0)) defaultCookie.maxAge = 0

  return async (ctx, next) => {
    const cookie = Object.assign({}, defaultCookie)

    // initialize session id and data
    const cookieSid = ctx.cookies.get(key)

    let sid = cookieSid
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await store.get(`${key}:${sid}`)
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {}
      }
    }

    const sessionClone = JSON.parse(JSON.stringify(ctx.session))

    // expose session handler to ctx
    ctx.sessionHandler = {
      regenerateId: () => {
        sid = uid.sync(24)
      },
      setMaxAge: ms => {
        cookie.maxAge = ms >= 0 ? ms : 0
      },
    }

    await next()

    const sessionHasData = ctx.session && Object.keys(ctx.session).length

    if (sid !== cookieSid) { // a new session id
      // clean old session
      if (cookieSid) deleteSession(ctx, key, cookie, store, cookieSid)

      // save new session
      if (sessionHasData) saveSession(ctx, key, cookie, store, sid)
    } else { // an existing session
      // data has not been changed
      if (deepEqual(ctx.session, sessionClone)) return

      // update session data
      if (sessionHasData) {
        saveSession(ctx, key, cookie, store, sid)
      } else {
        deleteSession(ctx, key, cookie, store, sid)
      }
    }
  }
}
