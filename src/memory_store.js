module.exports = class MemoryStore {
  constructor() {
    this.sessions = {} // data
    this.timeouts = {} // expiration handler
  }

  get(sid) {
    return this.sessions[sid]
  }

  set(sid, val, ttl) {
    this.sessions[sid] = val

    if (sid in this.timeouts) clearTimeout(this.timeouts[sid])
    this.timeouts[sid] = setTimeout(() => {
      delete this.sessions[sid]
      delete this.timeouts[sid]
    }, ttl)
  }

  destroy(sid) {
    if (sid in this.timeouts) {
      delete this.sessions[sid]

      clearTimeout(this.timeouts[sid])
      delete this.timeouts[sid]
    }
  }
}
