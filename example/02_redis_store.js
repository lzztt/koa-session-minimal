const Koa = require('koa')
const RedisStore = require('koa-redis')
const session = require('..')

const app = new Koa()

app.use(session({
  store: new RedisStore(),
}))

const counter = (ctx) => {
  if (ctx.path === '/favicon.ico') return // ignore favicon

  if (!('count' in ctx.session)) ctx.session.count = 0 // init counter

  ctx.session.count += 1
  ctx.body = ctx.session.count
}

app.use(counter)

app.listen(3000)
