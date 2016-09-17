const uid = require('uid-safe')
const deepEqual = require('deep-equal')
const Store = require('./store')
const MemoryStore = require('./memory_store')

const ONE_DAY = 24 * 3600 * 1000 // one day in milliseconds

const cookieOpt = (cookie) => {
  const options = Object.assign({
    maxAge: 0, // default to use session cookie
    path: '/',
    secure: false,
    httpOnly: true,
  }, cookie || {}, {
    overwrite: true, // overwrite previous session cookie changes
    signed: false, // disable signed option
  })
  if (!(options.maxAge >= 0)) options.maxAge = 0
  return options
}

const deleteSession = (ctx, key, cookie, store, sid) => {
  const options = cookie instanceof Function ? cookieOpt(cookie(ctx)) : Object.assign({}, cookie)
  delete options.maxAge
  ctx.cookies.set(key, null, options)
  store.destroy(`${key}:${sid}`)
}

const saveSession = (ctx, key, cookie, store, sid) => {
  const options = cookie instanceof Function ? cookieOpt(cookie(ctx)) : cookie
  const ttl = options.maxAge > 0 ? options.maxAge : ONE_DAY
  ctx.cookies.set(key, sid, options)
  store.set(`${key}:${sid}`, ctx.session, ttl)
}

module.exports = (options) => {
  const opt = options || {}
  const key = opt.key || 'koa:sess'
  const store = new Store(opt.store || new MemoryStore())
  const cookie = opt.cookie instanceof Function ? opt.cookie : cookieOpt(opt.cookie)

  return async (ctx, next) => { // eslint-disable-line arrow-parens
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
