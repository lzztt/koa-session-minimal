const co = require('co')

module.exports = class Store {
  constructor(store) {
    this.store = store
  }

  get(sid) {
    return co(this.store.get(sid))
  }

  set(sid, val = {}) {
    return co(this.store.set(sid, val))
  }

  destroy(sid) {
    return co(this.destroy(sid))
  }
}
