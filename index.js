const uid = require('uid-safe')

class MemoryStore {
  constructor() {
    this.sessions = {}
  }

  async get(sid) {
    return this.sessions[sid]
  }

  async set(sid, val = {}) {
    this.sessions[sid] = val
  }

  async destroy(sid) {
    delete this.sessions[sid]
  }
}


module.exports = (opts = {}) => {
  opts.key = opts.key || 'koa:sess'
  opts.store = opts.store || new MemoryStore()

  return async(ctx, next) => {
    // original session id
    const sidOrig = ctx.cookies.get(opts.key)

    let sid = sidOrig
    if (!sid) {
      sid = uid.sync(24)
      ctx.session = {}
    } else {
      ctx.session = await opts.store.get(`${opts.key}:${sid}`);
      // check session should be a no-null object
      if (!ctx.session || typeof ctx.session !== 'object') {
        ctx.session = {};
      }
    }

    // original session data
    const dataOrig = JSON.stringify(ctx.session)

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
    }

    await next()

    // session id has changed
    if (sid !== sidOrig) {
      if (sidOrig) {
        opts.store.destroy(`${opts.key}:${sidOrig}`)
      }
      // update cookie
      ctx.cookies.set(opts.key, sid)
    }

    // data not changed
    if (dataOrig === JSON.stringify(ctx.session)) return

    // set new session
    if (ctx.session && Object.keys(ctx.session).length) {
      opts.store.set(`${opts.key}:${sid}`, ctx.session)
    } else {
      opts.store.destroy(`${opts.key}:${sid}`)
    }
  }
}
