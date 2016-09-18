const MemoryStore = require('../src/memory_store')
const expect = require('chai').expect

describe('default memory store', () => {
  let sid
  let data
  let ttl

  beforeEach(() => {
    sid = Math.random().toString()
    data = {
      number: Math.random(),
    }
    ttl = Math.floor(Math.random() * 300) + 300
  })

  it('can set a session with ttl', () => {
    const store = new MemoryStore()
    store.set(sid, data, ttl)
  })

  it('will get "undefined" for a non-exist session', () => {
    const store = new MemoryStore()
    expect(store.get(sid)).to.be.equal(undefined)
  })

  it('can destory a session', () => {
    const store = new MemoryStore()
    store.destroy(sid)
  })

  it('can get session data within ttl', (done) => {
    const store = new MemoryStore()
    store.set(sid, data, ttl)
    setTimeout(() => {
      expect(store.get(sid)).to.be.deep.equal(data)
      done()
    }, ttl - 100)
  })

  it('cannot get session data after ttl', (done) => {
    const store = new MemoryStore()
    store.set(sid, data, ttl)
    setTimeout(() => {
      expect(store.get(sid)).to.be.equal(undefined)
      done()
    }, ttl + 100)
  })

  it('cannot get session data after destory within ttl', (done) => {
    const store = new MemoryStore()
    store.set(sid, data, ttl)
    store.destroy(sid)
    setTimeout(() => {
      expect(store.get(sid)).to.be.equal(undefined)
      done()
    }, ttl - 100)
  })

  it('can reset session data and update ttl', (done) => {
    const store = new MemoryStore()
    const newData = {
      number: Math.random(),
    }
    const resetTime = ttl - 200

    store.set(sid, data, ttl)

    setTimeout(() => {
      store.set(sid, newData, ttl)
    }, resetTime)

    setTimeout(() => {
      expect(store.get(sid)).to.be.deep.equal(data)
    }, resetTime - 100)

    setTimeout(() => {
      expect(store.get(sid)).to.be.deep.equal(newData)
    }, (resetTime + ttl) - 100)

    setTimeout(() => {
      expect(store.get(sid)).to.be.equal(undefined)
      done()
    }, (resetTime + ttl) + 100)
  })
})
