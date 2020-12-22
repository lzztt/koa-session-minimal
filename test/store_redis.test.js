const RedisStore = require('koa-redis')
const { expect } = require('chai')
const Store = require('../src/store')

const test = (name, sessionStore) => {
  describe(`store adapter wraps ${name}`, () => {
    let store
    let sid
    let data
    let ttl

    beforeEach(() => {
      store = new Store(sessionStore)
      sid = Math.random().toString()
      data = {
        number: Math.random(),
      }
      ttl = Math.floor(Math.random() * 300) + 300
    })

    it('can set a session with ttl', (done) => {
      store.set(sid, data, ttl)
        .then(done)
        .catch(done)
    })

    it('will get "null" for a non-exist session', (done) => {
      store.get(sid)
        .then((ret) => {
          expect(ret).to.be.equal(null)
          done()
        })
        .catch(done)
    })

    it('can destory a session', (done) => {
      store.destroy(sid)
        .then(done)
        .catch(done)
    })

    it('can get session data within ttl', (done) => {
      store.set(sid, data, ttl)
      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.deep.equal(data)
            done()
          })
          .catch(done)
      }, ttl - 100)
    })

    it('cannot get session data after ttl', (done) => {
      store.set(sid, data, ttl)
      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.equal(null)
            done()
          })
          .catch(done)
      }, ttl + 1000)
    })

    it('cannot get session data after destory within ttl', (done) => {
      store.set(sid, data, ttl)
      store.destroy(sid)
      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.equal(null)
            done()
          })
          .catch(done)
      }, ttl - 100)
    })

    it('can reset session data and update ttl', (done) => {
      const newData = {
        number: Math.random(),
      }
      const resetTime = ttl - 200

      store.set(sid, data, ttl)

      setTimeout(() => {
        store.set(sid, newData, ttl).catch(done)
      }, resetTime)

      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.deep.equal(data)
          })
          .catch(done)
      }, resetTime - 100)

      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.deep.equal(newData)
          })
          .catch(done)
      }, (resetTime + ttl) - 100)

      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.equal(null)
            done()
          })
          .catch(done)
      }, (resetTime + ttl) + 1000)
    })
  })
}

test('a redis store', new RedisStore())
