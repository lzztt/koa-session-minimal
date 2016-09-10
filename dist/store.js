'use strict';

const co = require('co');

module.exports = class Store {
  constructor(store) {
    this.store = store;
  }

  get(sid) {
    return co(this.store.get(sid));
  }

  set(sid, val, ttl) {
    return co(this.store.set(sid, val, ttl));
  }

  destroy(sid) {
    return co(this.store.destroy(sid));
  }
};