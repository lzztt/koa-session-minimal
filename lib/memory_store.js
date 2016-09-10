'use strict'

module.exports = class MemoryStore {
  constructor() {
    this.sessions = {}
  }

  async get(sid) {
    return this.sessions[sid]
  }

  async set(sid, val, ttl) { // eslint-disable-line no-unused-vars
    this.sessions[sid] = val
  }

  async destroy(sid) {
    delete this.sessions[sid]
  }
}
