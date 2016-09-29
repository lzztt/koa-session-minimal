const Koa = require('koa')
const session = require('..')
const RedisStore = require('koa-redis')

const app = new Koa()

const ONE_MONTH = 30 * 24 * 3600 * 1000

app.use(session({
  store: new RedisStore(),
  cookie: ctx => ({
    maxAge: ctx.session.user ? ONE_MONTH : 0,
    httpOnly: false,
  }),
}))

const counter = (ctx) => {
  if (ctx.path === '/favicon.ico') return // ignore favicon

  if (!('count' in ctx.session)) ctx.session.count = 0 // init counter

  ctx.session.count += 1
  ctx.body = ctx.session.count
}

app.use(counter)

app.listen(3000)
