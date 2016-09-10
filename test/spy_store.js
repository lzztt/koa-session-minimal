/* prefer-rest-params */
class AsyncSpyStore {
  constructor() {
    this.clear()
  }

  clear() {
    this.sessions = {}
    this.clearCalls()
  }

  clearCalls() {
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

  async set(sid, val, ttl) { // eslint-disable-line no-unused-vars
    this.calls.set.push([...arguments])
    this.sessions[sid] = val
  }

  async destroy(sid) {
    this.calls.destroy.push([...arguments])
    delete this.sessions[sid]
  }
}

class GeneratorSpyStore {
  constructor() {
    this.clear()
  }

  clear() {
    this.sessions = {}
    this.clearCalls()
  }

  clearCalls() {
    this.calls = {
      get: [],
      set: [],
      destroy: [],
    }
  }

  * get(sid) {
    this.calls.get.push([...arguments])
    return this.sessions[sid]
  }

  * set(sid, val, ttl) { // eslint-disable-line no-unused-vars
    this.calls.set.push([...arguments])
    this.sessions[sid] = val
  }

  * destroy(sid) {
    this.calls.destroy.push([...arguments])
    delete this.sessions[sid]
  }
}

module.exports = {
  AsyncSpyStore,
  GeneratorSpyStore,
}
