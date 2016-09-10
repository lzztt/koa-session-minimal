const uid = require('uid-safe')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const TTL_MIN = 24 * 3600 * 1000 // one day in milliseconds

const deleteCookie = (ctx, key, options) => {
  options.maxAge = 0
  ctx.cookies.set(key, null, options)
}

module.exports = ({ key = 'koa:sess', store = new MemoryStore(), cookie = null } = {}) => {
  const sessionStore = new Store(store)

  return async(ctx, next) => {
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

    // session data
    const storeData = JSON.stringify(ctx.session)
    let ttl = TTL_MIN

    // expose session handler to ctx
    ctx.sessionHandler = {
      getId: () => sid,
      regenerateId: () => {
        sid = uid.sync(24)
      },
      ttl: ms => {
        if (ms > TTL_MIN) ttl = ms
      },
    }

    await next()

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
      overwrite: true,
      signed: false, // disable signed option
    })

    // check maxAge
    if (ckOption.maxAge < 0) return

    // persistent cookie: data doesn't need to live longer than cookie
    if (ckOption.maxAge > 0 && ttl > ckOption.maxAge) {
      ttl = ckOption.maxAge
    }

    const sessionHasData = ctx.session && Object.keys(ctx.session).length

    if (sid !== cookieSid) { // a new session id
      // clean data for old session
      if (cookieSid) sessionStore.destroy(`${key}:${cookieSid}`)

      // save data for current session
      if (sessionHasData) {
        ctx.cookies.set(key, sid, ckOption)
        sessionStore.set(`${key}:${sid}`, ctx.session, ttl)
      } else if (cookieSid) {
        deleteCookie(ctx, key, ckOption)
      }
    } else { // an existing session
      // data is not changed
      if (storeData === JSON.stringify(ctx.session)) return

      // save session data
      if (sessionHasData) {
        sessionStore.set(`${key}:${sid}`, ctx.session, ttl)
      } else {
        deleteCookie(ctx, key, ckOption)
        sessionStore.destroy(`${key}:${sid}`)
      }
    }
  }
}
