const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const path = require('path')
const { execSync } = require('child_process')

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
  res.json({ build: buildId || 'unknown' })
})

// Serve React build
const distDir = path.join(__dirname, '..', 'dist')
app.use(express.static(distDir))

// SPA fallback (Express v5 compatible)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  if (buildId) console.log(`Build: ${buildId}`)
})
