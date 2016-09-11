'use strict'

const Koa = require('koa')
const request = require('supertest')
const expect = require('chai').expect
const session = require('../lib/session')

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
  }
  next()
}

const sessionToBody = ctx => {
  ctx.body = {
    sid: ctx.sessionHandler.getId(),
    data: ctx.session,
  }
}

const validateCookie = (res, key) => {
  const cookie = res.header['set-cookie']
  expect(cookie.length).to.be.equal(1)
  expect(cookie[0].slice(0, key.length + res.body.sid.length + 3))
    .to.be.equal(`${key}=${res.body.sid}; `)
}

const validateBody = (res, startTime) => {
  expect(res.body.data.time).to.be.at.least(startTime)
  expect(res.body.data.time).to.be.at.most(Date.now())
}


describe('session with default memory store', () => {
  const app = new Koa()
  const key = 'koa:sess'

  app.use(session())
  app.use(updateSession)
  app.use(sessionToBody)

  const client = request(app.listen())
  let startTime

  beforeEach(() => {
    startTime = Date.now()
  })

  it('should work and not set cookie for empty session', done => {
    client.get('/').expect(200).end((err, res) => {
      if (err) done(err)
      validateBody(res, startTime)
      expect(res.header['set-cookie']).to.be.equal(undefined)
    })
    done()
  })

  it('set session cookie when session has data', done => {
    client.get('/set/time').expect(200).end((err, res) => {
      if (err) done(err)
      validateCookie(res, key)
      validateBody(res, startTime)
      done()
    })
  })

  it('should work when multiple clients access', done => {
    Promise.all([
      new Promise((resolve, reject) => {
        client.get('/set/time').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body.sid)
        })
      }),
      new Promise((resolve, reject) => {
        client.get('/set/time').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body.sid)
        })
      }),
    ]).then(sids => {
      expect(sids[0]).to.be.not.equal(sids[1])
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('session data is available among multiple requests', done => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)

      const body1 = res1.body
      client.get('/set/time').expect(200).end((err2, res2) => {
        if (err2) done(err2)
        validateCookie(res2, key)
        validateBody(res2, startTime)
        expect(res2.body.sid).to.be.not.equal(body1.id)
        expect(res2.body.data.time).to.be.at.least(body1.data.time)

        client.get('/').set('cookie', `${key}=${body1.sid}`)
          .expect(200).end((err3, res3) => {
            if (err3) done(err3)
            expect(res3.header['set-cookie']).to.be.equal(undefined)
            expect(res3.body).to.be.deep.equal(body1)

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
                done()
              })
          })
      })
    })
  })

  it('set ctx.session = {} should clear session data', done => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)

      const body1 = res1.body
      client.get('/set/empty').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          expect(res2.body).to.be.deep.equal({
            sid: body1.sid,
            data: {},
          })
          res2.body.sid = ''
          validateCookie(res2, key)

          client.get('/').set('cookie', `${key}=${body1.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              expect(res3.body).to.be.deep.equal({
                sid: body1.sid,
                data: {},
              })
              done()
            })
        })
    })
  })

  it('set ctx.session = null should clear session data', done => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)

      const body1 = res1.body
      client.get('/set/null').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          expect(res2.body).to.be.deep.equal({
            sid: body1.sid,
            data: null,
          })
          res2.body.sid = ''
          validateCookie(res2, key)

          client.get('/').set('cookie', `${key}=${body1.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              expect(res3.body).to.be.deep.equal({
                sid: body1.sid,
                data: {},
              })
              done()
            })
        })
    })
  })

  it('regenerateId() should regenerate session id', done => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)

      const body1 = res1.body
      client.get('/regenerate_id').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          validateCookie(res2, key)
          validateBody(res2, startTime)
          expect(res2.body.sid).to.be.not.equal(body1.sid)
          expect(res2.body.data.time).to.be.equal(body1.data.time)

          const body2 = res2.body
          client.get('/').set('cookie', `${key}=${body2.sid}`)
            .expect(200).end((err3, res3) => {
              if (err3) done(err3)
              expect(res3.header['set-cookie']).to.be.equal(undefined)
              validateBody(res3, startTime)
              expect(res3.body.sid).to.be.equal(body2.sid)
              expect(res3.body.data.time).to.be.equal(body2.data.time)
              done()
            })
        })
    })
  })
})

describe('default memory store with customized cookie options', () => {
  const app = new Koa()
  const key = 'koa:sess'

  app.use(session({
    cookie: {
      maxAge: -1000,
    },
  }))
  app.use(updateSession)
  app.use(sessionToBody)

  const client = request(app.listen())
  let startTime

  beforeEach(() => {
    startTime = Date.now()
  })

  it('negative maxAge value will be treated as 0 (default value)', done => {
    client.get('/set/time').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)

      const body1 = res1.body
      client.get('/').set('cookie', `${key}=${body1.sid}`)
        .expect(200).end((err2, res2) => {
          if (err2) done(err2)
          expect(res2.header['set-cookie']).to.be.equal(undefined)
          expect(res2.body).to.be.deep.equal(body1)
          done()
        })
    })
  })
})
