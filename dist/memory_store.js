'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

module.exports = class MemoryStore {
  constructor() {
    this.sessions = {};
  }

  get(sid) {
    var _this = this;

    return _asyncToGenerator(function* () {
      return _this.sessions[sid];
    })();
  }

  set(sid, val, ttl) {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      // eslint-disable-line no-unused-vars
      _this2.sessions[sid] = val;
    })();
  }

  destroy(sid) {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      delete _this3.sessions[sid];
    })();
  }
};