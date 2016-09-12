module.exports = class MemoryStore {
  constructor() {
    this.sessions = {}
  }

  get(sid) {
    return this.sessions[sid]
  }

  set(sid, val, ttl) { // eslint-disable-line no-unused-vars
    this.sessions[sid] = val
  }

  destroy(sid) {
    delete this.sessions[sid]
  }
}
