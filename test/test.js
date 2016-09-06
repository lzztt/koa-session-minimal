const Koa = require('koa')
const request = require('supertest')
const session = require('../index')
const expect = require('chai').expect


class SpyStore {

  constructor() {
    this.sessions = {}
    this.calls = {
      get: [],
      set: [],
      destroy: [],
    }
  }

  async get(sid) {
    this.calls.get.push([...arguments])
    return this.sessions[sid]
  }

  async set(sid, val = {}) {
    this.calls.set.push([...arguments])
    this.sessions[sid] = val
  }

  async destroy(sid) {
    this.calls.destroy.push([...arguments])
    delete this.sessions[sid]
  }
}

const sessionBody = ctx => {
  if (Object.keys(ctx.session).length === 0) {
    ctx.session.id = ctx.sessionHandler.getId()
    ctx.session.time = Date.now()
  }
  ctx.body = ctx.session
}

const validateCookie = (res, key) => {
  const cookie = res.header['set-cookie']
  expect(cookie.length).to.be.equal(1)
  expect(cookie[0].slice(0, key.length + 35)).to.be.equal(`${key}=${res.body.id}; `)
}
const validateBody = (res, startTime) => {
  expect(res.body.time).to.be.at.least(startTime)
  expect(res.body.time).to.be.at.most(Date.now())
}


describe('koa-session-minimal', () => {
  describe('when use default memory store', () => {
    const app = new Koa()
    const key = 'koa:sess'

    app.use(session())
    app.use(sessionBody)

    const client = request(app.listen())

    it('should work and set session cookie', (done) => {
      const startTime = Date.now()
      client.get('/')
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
          client.get('/').end((err, res) => {
            if (err) reject(err)
            validateCookie(res, key)
            validateBody(res, startTime)
            resolve(res.body.id)
          })
        }),
        new Promise((resolve, reject) => {
          client.get('/').end((err, res) => {
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
      client.get('/').end((err1, res1) => {
        if (err1) done(err1)
        validateCookie(res1, key)
        validateBody(res1, startTime)
        const session = res1.body

        client.get('/').end((err2, res2) => {
          if (err2) done(err2)
          validateCookie(res2, key)
          validateBody(res2, startTime)
          expect(res2.body.id).to.be.not.equal(session.id)
          expect(res2.body.time).to.be.at.least(session.time)

          client.get('/').set('cookie', `${key}=${session.id}`).end((err3, res3) => {
            if (err3) done(err3)
            expect(res3.header['set-cookie']).to.be.equal(undefined)
            expect(res3.body).to.be.deep.equal(session)
            done()
          })
        })
      })
    })
  })

})
