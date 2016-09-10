'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

const uid = require('uid-safe');
const deepEqual = require('deep-equal');
const Store = require('./store');
const MemoryStore = require('./memory_store');

const ONE_DAY = 24 * 3600 * 1000; // one day in milliseconds

const deleteSession = (ctx, key, ckOption, store, sid) => {
  const deleteOption = Object.assign({}, ckOption);
  delete deleteOption.maxAge;
  ctx.cookies.set(key, null, deleteOption);
  store.destroy(`${ key }:${ sid }`);
};

const saveSession = (ctx, key, ckOption, store, sid) => {
  const ttl = ckOption.maxAge > 0 ? ckOption.maxAge : ONE_DAY;
  ctx.cookies.set(key, sid, ckOption);
  store.set(`${ key }:${ sid }`, ctx.session, ttl);
};

module.exports = options => {
  const opt = options || {};
  const key = opt.key || 'koa:sess';
  const store = new Store(opt.store || new MemoryStore());
  const cookie = opt.cookie || {};

  return (() => {
    var _ref = _asyncToGenerator(function* (ctx, next) {
      // setup cookie options
      const ckOption = {
        maxAge: 0, // default to use session cookie
        path: '/',
        secure: false,
        httpOnly: true
      };
      Object.assign(ckOption, cookie);
      Object.assign(ckOption, {
        overwrite: true, // overwrite previous session cookie changes
        signed: false });
      if (!(ckOption.maxAge >= 0)) ckOption.maxAge = 0;

      // initialize session id and data
      const cookieSid = ctx.cookies.get(key);

      let sid = cookieSid;
      if (!sid) {
        sid = uid.sync(24);
        ctx.session = {};
      } else {
        ctx.session = yield store.get(`${ key }:${ sid }`);
        if (!ctx.session || typeof ctx.session !== 'object') {
          ctx.session = {};
        }
      }

      const sessionClone = JSON.parse(JSON.stringify(ctx.session));

      // expose session handler to ctx
      ctx.sessionHandler = {
        getId: function () {
          return sid;
        },
        regenerateId: function () {
          sid = uid.sync(24);
        },
        setMaxAge: function (ms) {
          ckOption.maxAge = ms >= 0 ? ms : 0;
        }
      };

      yield next();

      const sessionHasData = ctx.session && Object.keys(ctx.session).length;

      if (sid !== cookieSid) {
        // a new session id
        // clean old session
        if (cookieSid) deleteSession(ctx, key, ckOption, store, cookieSid);

        // save new session
        if (sessionHasData) saveSession(ctx, key, ckOption, store, sid);
      } else {
        // an existing session
        // data has not been changed
        if (deepEqual(ctx.session, sessionClone)) return;

        // update session data
        if (sessionHasData) {
          saveSession(ctx, key, ckOption, store, sid);
        } else {
          deleteSession(ctx, key, ckOption, store, sid);
        }
      }
    });

    return function (_x, _x2) {
      return _ref.apply(this, arguments);
    };
  })();
};