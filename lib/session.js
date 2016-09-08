const uid = require('uid-safe')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const oneDay = 24 * 3600 * 1000
const oneMinute = 60 * 1000

const setCookie = (ctx, name, value, options) => {
  Object.assign(options, {
    overwrite: true,
    signed: false,
  })
  ctx.cookies.set(name, value, options)
}

module.exports = ({ key = 'koa:sess', store = new MemoryStore(), cookie = null } = {}) => {
  // setup cookie options
  const ckOption = {
    maxAge: 0, // one day in ms
    path: '/',
    secure: false,
    httpOnly: true,
  }
  if (cookie && typeof cookie === 'object') {
    Object.assign(ckOption, cookie)
  }

  const sessionStore = new Store(store)

  return async(ctx, next) => {
    const cookieSid = ctx.cookies.get(key)

    let sid = cookieSid
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await sessionStore.get(`${key}:${sid}`)
        // session should be a no-null object
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {}
      }
    }

    // session data
    const cookieOptions = JSON.stringify(ckOption)
    const storeData = JSON.stringify(ctx.session)

    // expose session handler to ctx
    ctx.sessionHandler = {
      getId: () => sid,
      clear: () => {
        ctx.session = {}
      },
      regenerate: () => {
        sid = uid.sync(24)
        ctx.session = {}
      },
      getCookie: () => ckOption,
      setCookie: cookieOpt => {
        Object.assign(ckOption, cookieOpt)
      },
    }

    await next()

    // check session cookie
    if (sid !== cookieSid) {
      // new session id
      if (cookieSid) {
        sessionStore.destroy(`${key}:${cookieSid}`)
      }
      // update cookie
      setCookie(ctx, key, sid, ckOption)
    } else if (cookieOptions !== JSON.stringify(ckOption)) {
      // new cookie options
      setCookie(ctx, key, sid, ckOption)
    }

    // check session data maxAge/ttl
    let ttl = oneMinute
    if (ckOption.maxAge > oneMinute) {
      ttl = ckOption.maxAge // session with persistent cookie
    } else if (ckOption.maxAge >= 0) {
      ttl = oneDay // session with transient cookie, keep data for one day
    } else {
      // session with expired cookie, delete session data
      sessionStore.destroy(`${key}:${sid}`)
      return
    }

    // data is not changed
    if (storeData === JSON.stringify(ctx.session)) return

    // update new session to sessionStore
    if (ctx.session && Object.keys(ctx.session).length) {
      sessionStore.set(`${key}:${sid}`, ctx.session, ttl)
    } else {
      sessionStore.destroy(`${key}:${sid}`)
    }
  }
}
