const Koa = require('koa')
const session = require('..')
const RedisStore = require('koa-redis')

const app = new Koa()

const ONE_DAY = 24 * 3600 * 1000

app.use(session({
  key: 'SESSID',
  store: new RedisStore(),
  cookie: {
    maxAge: ONE_DAY,
    httpOnly: false,
  },
}))

const counter = (ctx) => {
  if (ctx.path === '/favicon.ico') return // ignore favicon

  if (!('count' in ctx.session)) ctx.session.count = 0 // init counter

  ctx.session.count += 1
  ctx.body = ctx.session.count
}

app.use(counter)

app.listen(3000)
