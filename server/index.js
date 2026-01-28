const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const path = require('path')
const { execSync } = require('child_process')
const { migrate, all, get, run, dbPath } = require('./db')

// Built-in fetch in Node 18+ (Render uses modern Node)

const app = express()
app.use(express.json())
app.use(cookieParser())

// Render sets PORT; local dev default
const PORT = process.env.PORT || 3000

// MVP hardcoded demo user
const USER = {
  username: 'juan',
  // password: secret123
  passwordHash: bcrypt.hashSync('secret123', 10),
}

function setAuthCookie(res, username) {
  res.cookie('user', username, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

app.get('/api/me', (req, res) => {
  const u = req.cookies.user
  res.json({ user: u || null })
})

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {}

  if (username !== USER.username) return res.status(401).send('Bad login')
  const ok = await bcrypt.compare(String(password || ''), USER.passwordHash)
  if (!ok) return res.status(401).send('Bad login')

  setAuthCookie(res, username)
  res.json({ ok: true })
})

// Support both POST (from SPA) and GET (if user visits the URL directly)
app.all('/api/logout', (req, res) => {
  res.clearCookie('user')
  const acceptsHtml = (req.headers.accept || '').includes('text/html')
  if (req.method === 'GET' && acceptsHtml) return res.redirect('/')
  res.json({ ok: true })
})

// Convenience route
app.get('/logout', (req, res) => {
  res.clearCookie('user')
  res.redirect('/')
})

// Add a visible build marker (commit hash)
let buildId = process.env.RENDER_GIT_COMMIT || process.env.SOURCE_VERSION || ''
if (!buildId) {
  try {
    buildId = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {}
}

app.get('/api/build', (req, res) => {
  res.json({ build: buildId || 'unknown', db: dbPath })
})

function requireAuth(req, res, next) {
  const u = req.cookies.user
  if (!u) return res.status(401).send('Unauthorized')
  req.user = u
  next()
}

// Users CRUD (protected)
app.get('/api/users', requireAuth, async (req, res) => {
  const users = await all('SELECT id, name, role FROM users ORDER BY id ASC')
  res.json({ users })
})

// News: simple RSS proxy (BBC World)
app.get('/api/news', requireAuth, async (req, res) => {
  const url = 'https://feeds.bbci.co.uk/news/world/rss.xml'
  const r = await fetch(url, { headers: { 'user-agent': 'hello-auth/1.0' } })
  if (!r.ok) return res.status(502).send('news fetch failed')
  const xml = await r.text()

  // Minimal RSS parsing (good enough for MVP)
  const items = []
  const blocks = xml.split('<item>').slice(1)
  for (const b of blocks.slice(0, 10)) {
    const title = (b.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || b.match(/<title>(.*?)<\/title>/))?.[1]
    const link = (b.match(/<link>(.*?)<\/link>/) || [])[1]
    if (title && link) items.push({ title: title.trim(), link: link.trim(), source: 'BBC World' })
  }

  res.json({ items })
})

// Weather: Open-Meteo + reverse geocode (Nominatim)
app.get('/api/weather', requireAuth, async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).send('lat/lon required')

  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=temperature_2m,wind_speed_10m&timezone=auto`
  const wr = await fetch(wUrl)
  if (!wr.ok) return res.status(502).send('weather fetch failed')
  const wj = await wr.json()

  let place = ''
  try {
    const gUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
    const gr = await fetch(gUrl, { headers: { 'user-agent': 'hello-auth/1.0 (Render demo)' } })
    if (gr.ok) {
      const gj = await gr.json()
      place = gj?.address?.city || gj?.address?.town || gj?.address?.suburb || gj?.address?.state || gj?.display_name || ''
    }
  } catch {}

  const tempC = wj?.current?.temperature_2m
  const windKph = wj?.current?.wind_speed_10m
  const time = wj?.current?.time

  res.json({ place, tempC, windKph, time, lat, lon })
})

app.post('/api/users', requireAuth, async (req, res) => {
  const { name, role } = req.body || {}
  if (!name || !role) return res.status(400).send('name and role required')
  const r = await run('INSERT INTO users (name, role) VALUES (?, ?)', [String(name), String(role)])
  const user = await get('SELECT id, name, role FROM users WHERE id = ?', [r.lastID])
  res.json({ user })
})

app.put('/api/users/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  const { name, role } = req.body || {}
  if (!id) return res.status(400).send('bad id')
  if (!name || !role) return res.status(400).send('name and role required')
  await run('UPDATE users SET name = ?, role = ? WHERE id = ?', [String(name), String(role), id])
  const user = await get('SELECT id, name, role FROM users WHERE id = ?', [id])
  if (!user) return res.status(404).send('not found')
  res.json({ user })
})

app.delete('/api/users/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id)
  if (!id) return res.status(400).send('bad id')
  const r = await run('DELETE FROM users WHERE id = ?', [id])
  if (r.changes === 0) return res.status(404).send('not found')
  res.json({ ok: true })
})

// Serve React build
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

// SPA fallback (Express v5 compatible)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

async function main() {
  await migrate()
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
    if (buildId) console.log(`Build: ${buildId}`)
    console.log(`SQLite: ${dbPath}`)
  })
}

main().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
