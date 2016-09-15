const Koa = require('koa')
const request = require('supertest')
const expect = require('chai').expect
const session = require('../src/session')
const SpyStore = require('./spy_store').AsyncSpyStore

const updateSession = (ctx, next) => {
  switch (ctx.url) {
    case '/set/time':
      ctx.session.time = Date.now()
      break
    case '/set/random':
      ctx.session.random = Math.random()
      break
    case '/set/null':
      ctx.session = null
      break
    case '/set/empty':
      ctx.session = {}
      break
    case '/regenerate_id':
      ctx.sessionHandler.regenerateId()
      break
    default:
      if (ctx.url.startsWith('/maxage/')) {
        ctx.ms = parseInt(ctx.url.replace('/maxage/', ''), 10)
        ctx.session.time = Date.now()
      }
  }
  next()
}

const sessionToBody = (ctx) => {
  ctx.body = {
    data: ctx.session,
  }
}

const getCookies = (res) => {
  const cookies = res.header['set-cookie']
  if (cookies) {
    return cookies.map((c) => {
      const match = c.match(/([^=]*)=([^;]*); path=([^;]*); /)
      if (match) {
        return {
          name: match[1],
          value: match[2],
          path: match[3],
        }
      }
      return null
    })
  }

  return null
}

const populateSid = (res) => {
  const cookies = getCookies(res)
  res.body.sid = cookies ? cookies[0].value : null
}

const validateCookie = (res, key) => {
  const cookies = getCookies(res)
  expect(cookies.length).to.be.equal(1)
  expect(cookies[0].name).to.be.equal(key)
  expect(cookies[0].path).to.be.equal('/')
}

const validateBody = (res, startTime) => {
  populateSid(res)
  expect(res.body.data.time).to.be.at.least(startTime)
  expect(res.body.data.time).to.be.at.most(Date.now())
}

const validateStoreCalls = (store, calls) => {
  ['get', 'set', 'destroy'].forEach((m) => {
    expect(store.calls[m]).to.be.deep.equal(calls[m])
  })
  store.clearCalls()
}


describe('session with async store', () => {
  const app = new Koa()
  const key = 'koa:sess'
  const store = new SpyStore()

  app.use(session({
    store,
  }))
  app.use(updateSession)
  app.use(sessionToBody)

  const client = request(app.listen())
  let startTime
  let ttl

  beforeEach(() => {
    store.clear()
    ttl = 24 * 3600 * 1000 // one day in milliseconds
    startTime = Date.now()
  })

  it('should work and not set cookie for empty session', (done) => {
    client.get('/').expect(200).end((err, res) => {
      if (err) done(err)
      validateBody(res, startTime)
      expect(res.header['set-cookie']).to.be.equal(undefined)
    })
    validateStoreCalls(store, {
      get: [],
      set: [],
      destroy: [],
    })
    done()
  })

  it('set session cookie when session has data', (done) => {
    client.get('/set/time').expect(200).end((err, res) => {
      if (err) done(err)
      validateCookie(res, key)
      validateBody(res, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res.body.sid}`, res.body.data, ttl],
        ],
        destroy: [],
      })
      done()
    })
  })

  it('should work when multiple clients access', (done) => {
    Promise.all([
      new Promise((resolve, reject) => {
        client.get('/set/time').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body)
        })
      }),
      new Promise((resolve, reject) => {
        client.get('/set/time').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body)
        })
      }),
    ]).then((bodies) => {
      expect(bodies[0].sid).to.be.not.equal(bodies[1].sid)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${bodies[0].sid}`, bodies[0].data, ttl],
          [`${key}:${bodies[1].sid}`, bodies[1].data, ttl],
        ],
        destroy: [],
      })
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('session data is available among multiple requests', (done) => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const body1 = res1.body
      client.get('/set/time').expect(200).end((err2, res2) => {
        if (err2) done(err2)
        validateCookie(res2, key)
        validateBody(res2, startTime)
        expect(res2.body.sid).to.be.not.equal(body1.sid)
        expect(res2.body.data.time).to.be.at.least(body1.data.time)
        validateStoreCalls(store, {
          get: [],
          set: [
            [`${key}:${res2.body.sid}`, res2.body.data, ttl],
          ],
          destroy: [],
        })

        client.get('/').set('cookie', `${key}=${body1.sid}`)
          .expect(200).end((err3, res3) => {
            if (err3) done(err3)
            expect(res3.header['set-cookie']).to.be.equal(undefined)
            expect(res3.body.data).to.be.deep.equal(body1.data)
            validateStoreCalls(store, {
              get: [
                [`${key}:${body1.sid}`],
              ],
              set: [],
              destroy: [],
            })

            const body2 = res2.body
            client.get('/set/random').set('cookie', `${key}=${body2.sid}`)
              .expect(200).end((err4, res4) => {
                if (err4) done(err4)
                validateCookie(res4, key)
                validateBody(res4, body2.data.time)
                expect(res4.body.sid).to.be.equal(body2.sid)
                expect(res4.body.data.time).to.be.equal(body2.data.time)
                expect(body2.data.random).to.not.exist // eslint-disable-line no-unused-expressions
                expect(res4.body.data.random).to.exist // eslint-disable-line no-unused-expressions
                validateStoreCalls(store, {
                  get: [
                    [`${key}:${body2.sid}`],
                  ],
                  set: [
                    [`${key}:${body2.sid}`, res4.body.data, ttl],
                  ],
                  destroy: [],
                })
                done()
              })
          })
      })
    })
  })

  it('set ctx.session = {} should clear session data', (done) => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const body1 = res1.body
      client.get('/set/empty').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          populateSid(res2)
          expect(res2.body).to.be.deep.equal({
            sid: '',
            data: {},
          })
          res2.body.sid = ''
          validateCookie(res2, key)
          validateStoreCalls(store, {
            get: [
              [`${key}:${res1.body.sid}`],
            ],
            set: [],
            destroy: [
              [`${key}:${res1.body.sid}`],
            ],
          })

          client.get('/').set('cookie', `${key}=${body1.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              populateSid(res3)
              expect(res3.body).to.be.deep.equal({
                sid: null,
                data: {},
              })
              validateStoreCalls(store, {
                get: [
                  [`${key}:${res1.body.sid}`],
                ],
                set: [],
                destroy: [],
              })
              done()
            })
        })
    })
  })

  it('set ctx.session = null should clear session data', (done) => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const body1 = res1.body
      client.get('/set/null').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          populateSid(res2)
          expect(res2.body).to.be.deep.equal({
            sid: '',
            data: null,
          })
          res2.body.sid = ''
          validateCookie(res2, key)
          validateStoreCalls(store, {
            get: [
              [`${key}:${res1.body.sid}`],
            ],
            set: [],
            destroy: [
              [`${key}:${res1.body.sid}`],
            ],
          })

          client.get('/').set('cookie', `${key}=${body1.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              populateSid(res3)
              expect(res3.body).to.be.deep.equal({
                sid: null,
                data: {},
              })
              validateStoreCalls(store, {
                get: [
                  [`${key}:${res1.body.sid}`],
                ],
                set: [],
                destroy: [],
              })
              done()
            })
        })
    })
  })

  it('regenerateId() should regenerate session id', (done) => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const body1 = res1.body
      client.get('/regenerate_id').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          validateCookie(res2, key)
          validateBody(res2, startTime)
          expect(res2.body.sid).to.be.not.equal(body1.sid)
          expect(res2.body.data.time).to.be.equal(body1.data.time)
          validateStoreCalls(store, {
            get: [
              [`${key}:${res1.body.sid}`],
            ],
            set: [
              [`${key}:${res2.body.sid}`, res2.body.data, ttl],
            ],
            destroy: [
              [`${key}:${res1.body.sid}`],
            ],
          })

          const body2 = res2.body
          client.get('/').set('cookie', `${key}=${body2.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              validateBody(res3, startTime)
              expect(res3.body.sid).to.be.equal(null)
              expect(res3.body.data).to.be.deep.equal(body2.data)
              validateStoreCalls(store, {
                get: [
                  [`${key}:${res2.body.sid}`],
                ],
                set: [],
                destroy: [],
              })
              done()
            })
        })
    })
  })
})

describe('async store with dynamic cookie options', () => {
  const app = new Koa()
  const key = 'koa:sess'
  const store = new SpyStore()

  app.use(session({
    store,
    cookie: (ctx) => { // eslint-disable-line arrow-body-style
      return {
        maxAge: ctx.ms,
      }
    },
  }))
  app.use(updateSession)
  app.use(sessionToBody)

  const client = request(app.listen())
  let startTime
  let ttl

  beforeEach(() => {
    store.clear()
    ttl = 24 * 3600 * 1000 // one day in milliseconds
    startTime = Date.now()
  })

  it('setMaxAge(ms) should set maxAge and ttl', (done) => {
    client.get('/maxage/0').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const maxAge = 123
      client.get(`/maxage/${maxAge}`).expect(200).end((err2, res2) => {
        if (err2) done(err2)
        validateCookie(res2, key)
        validateBody(res2, startTime)
        validateStoreCalls(store, {
          get: [],
          set: [
            [`${key}:${res2.body.sid}`, res2.body.data, maxAge],
          ],
          destroy: [],
        })

        client.get('/maxage/-1').expect(200).end((err3, res3) => {
          if (err3) done(err3)
          validateCookie(res3, key)
          validateBody(res3, startTime)
          validateStoreCalls(store, {
            get: [],
            set: [
              [`${key}:${res3.body.sid}`, res3.body.data, ttl],
            ],
            destroy: [],
          })
          done()
        })
      })
    })
  })
})

describe('async store with customized cookie options', () => {
  const app = new Koa()
  const key = 'koa:sess'
  const store = new SpyStore()

  app.use(session({
    store,
    cookie: {
      maxAge: -1000,
    },
  }))
  app.use(updateSession)
  app.use(sessionToBody)

  const client = request(app.listen())
  let startTime
  let ttl

  beforeEach(() => {
    store.clear()
    ttl = 24 * 3600 * 1000 // one day in milliseconds
    startTime = Date.now()
  })

  it('negative maxAge value will be treated as 0 (default value)', (done) => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      validateStoreCalls(store, {
        get: [],
        set: [
          [`${key}:${res1.body.sid}`, res1.body.data, ttl],
        ],
        destroy: [],
      })

      const body1 = res1.body
      client.get('/').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          expect(res2.header['set-cookie']).to.be.equal(undefined)
          expect(res2.body.data).to.be.deep.equal(body1.data)
          validateStoreCalls(store, {
            get: [
              [`${key}:${body1.sid}`],
            ],
            set: [],
            destroy: [],
          })
          done()
        })
    })
  })
})
