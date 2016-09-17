module.exports = class MemoryStore {
  constructor() {
    this.sessions = {}
    this.timeouts = {}
  }

  get(sid) {
    return this.sessions[sid]
  }

  set(sid, val, ttl) {
    this.sessions[sid] = val

    if (sid in this.timeouts) clearTimeout(this.timeouts[sid])
    this.timeouts[sid] = setTimeout(this.destroy.bind(this, sid), ttl)
  }

  destroy(sid) {
    delete this.sessions[sid]
    delete this.timeouts[sid]
  }
}
