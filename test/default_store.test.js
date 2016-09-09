const Koa = require('koa')
const request = require('supertest')
const expect = require('chai').expect
const Router = require('koa-router')
const session = require('../lib/session')

const sessionBody = ctx => {
  ctx.body = ctx.session
}

const router = new Router()
router.get('/', sessionBody)
router.get('/set', (ctx, next) => {
  ctx.session = {
    id: ctx.sessionHandler.getId(),
    time: Date.now(),
  }
  next()
}, sessionBody)
router.get('/clear', (ctx, next) => {
  ctx.session = {}
  next()
}, sessionBody)
router.get('/regenerate', (ctx, next) => {
  ctx.sessionHandler.regenerateId()
  if (ctx.session.id) {
    ctx.session.id = ctx.sessionHandler.getId()
  }
  next()
}, sessionBody)

const validateCookie = (res, key) => {
  const cookie = res.header['set-cookie']
  expect(cookie.length).to.be.equal(1)
  expect(cookie[0].slice(0, key.length + 35)).to.be.equal(`${key}=${res.body.id}; `)
}
const validateBody = (res, startTime) => {
  expect(res.body.time).to.be.at.least(startTime)
  expect(res.body.time).to.be.at.most(Date.now())
}


describe('session with default memory store', () => {
  const app = new Koa()
  const key = 'koa:sess'

  app.use(session())
  app.use(router.routes())
  app.use(router.allowedMethods())

  const client = request(app.listen())

  it('should work and set session cookie', (done) => {
    const startTime = Date.now()
    client.get('/set')
      .expect(200)
      .end((err, res) => {
        if (err) done(err)
        validateCookie(res, key)
        validateBody(res, startTime)
        done()
      })
  })

  it('should work when multiple clients access', done => {
    const startTime = Date.now()
    Promise.all([
      new Promise((resolve, reject) => {
        client.get('/set').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body.id)
        })
      }),
      new Promise((resolve, reject) => {
        client.get('/set').expect(200).end((err, res) => {
          if (err) reject(err)
          validateCookie(res, key)
          validateBody(res, startTime)
          resolve(res.body.id)
        })
      })
    ]).then(sids => {
      expect(sids[0]).to.be.not.equal(sids[1])
      done()
    }).catch((err) => {
      done(err)
    })
  })

  it('session data is available among multiple requests', done => {
    const startTime = Date.now()
    client.get('/set').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      const session = res1.body

      client.get('/set').expect(200).end((err2, res2) => {
        if (err2) done(err2)
        validateCookie(res2, key)
        validateBody(res2, startTime)
        expect(res2.body.id).to.be.not.equal(session.id)
        expect(res2.body.time).to.be.at.least(session.time)

        client.get('/').set('cookie', `${key}=${session.id}`).expect(200).end((err3, res3) => {
          if (err3) done(err3)
          expect(res3.header['set-cookie']).to.be.equal(undefined)
          expect(res3.body).to.be.deep.equal(session)
          done()
        })
      })
    })
  })

  it('set ctx.session = null should clear session data', done => {
    const startTime = Date.now()
    client.get('/set').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      const session = res1.body

      client.get('/clear').set('cookie', `${key}=${session.id}`).expect(200).end((err2, res2) => {
        if (err2) done(err2)
        expect(res2.header['set-cookie']).to.be.equal(undefined)
        expect(res2.body).to.be.deep.equal({})

        client.get('/').set('cookie', `${key}=${session.id}`).expect(200).end((err3, res3) => {
          if (err3) done(err3)
          expect(res3.header['set-cookie']).to.be.equal(undefined)
          expect(res3.body).to.be.deep.equal({})
          client.get('/set').set('cookie', `${key}=${session.id}`).expect(200).end((err4, res4) => {
            if (err4) done(err4)
            expect(res4.header['set-cookie']).to.be.equal(undefined)
            validateBody(res4, startTime)
            expect(res4.body.id).to.be.equal(session.id)
            done()
          })
        })
      })
    })
  })

  it('regenerateId() should regenerate session id', done => {
    const startTime = Date.now()
    client.get('/set').expect(200).end((err1, res1) => {
      if (err1) done(err1)
      validateCookie(res1, key)
      validateBody(res1, startTime)
      const session = res1.body

      client.get('/regenerate').set('cookie', `${key}=${session.id}`).expect(200).end((err2, res2) => {
        if (err2) done(err2)
        validateCookie(res2, key)
        validateBody(res2, startTime)
        expect(res2.body.id).to.be.not.equal(session.id)
        expect(res2.body.time).to.be.equal(session.time)
        const session2 = res2.body

        client.get('/').set('cookie', `${key}=${session2.id}`).expect(200).end((err3, res3) => {
          if (err3) done(err3)
          expect(res3.header['set-cookie']).to.be.equal(undefined)
          validateBody(res3, startTime)
          expect(res3.body.id).to.be.equal(session2.id)
          expect(res3.body.time).to.be.equal(session2.time)
          done()
        })
      })
    })
  })
})
