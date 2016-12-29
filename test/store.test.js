const MemoryStore = require('../src/memory_store')
const Store = require('../src/store')
const expect = require('chai').expect


class GeneratorStore {
  constructor() {
    this.store = new MemoryStore()
  }

  * get(sid) {
    return yield Promise.resolve(this.store.get(sid))
  }

  * set(sid, val, ttl) {
    yield Promise.resolve(this.store.set(sid, val, ttl))
  }

  * destroy(sid) {
    yield Promise.resolve(this.store.destroy(sid))
  }
}

class AsyncStore {
  constructor() {
    this.store = new MemoryStore()
  }

  async get(sid) {
    return this.store.get(sid)
  }

  async set(sid, val, ttl) {
    await this.store.set(sid, val, ttl)
  }

  async destroy(sid) {
    await this.store.destroy(sid)
  }
}


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

    it('will get "undefined" for a non-exist session', (done) => {
      store.get(sid)
        .then((ret) => {
          expect(ret).to.be.equal(undefined)
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
            expect(ret).to.be.equal(undefined)
            done()
          })
          .catch(done)
      }, ttl + 100)
    })

    it('cannot get session data after destory within ttl', (done) => {
      store.set(sid, data, ttl)
      store.destroy(sid)
      setTimeout(() => {
        store.get(sid)
          .then((ret) => {
            expect(ret).to.be.equal(undefined)
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
            expect(ret).to.be.equal(undefined)
            done()
          })
          .catch(done)
      }, (resetTime + ttl) + 100)
    })
  })
}

test('the default memory store', new MemoryStore())
test('a generator store', new GeneratorStore())
test('an async store', new AsyncStore())
