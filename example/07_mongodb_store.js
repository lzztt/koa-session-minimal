const Koa = require('koa')
const session = require('..')
const MongoStore = require('koa-generic-session-mongo')

const app = new Koa()

app.use(session({
  store: new MongoStore(),
}))

const counter = (ctx) => {
  if (ctx.path === '/favicon.ico') return // ignore favicon

  if (!('count' in ctx.session)) ctx.session.count = 0 // init counter

  ctx.session.count += 1
  ctx.body = ctx.session.count
}

app.use(counter)

app.listen(3000)
