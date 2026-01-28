const express = require('express')
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt')
const path = require('path')

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
  // For MVP: unsigned cookie. In real apps: signed + server-side session store.
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

app.post('/api/logout', (req, res) => {
  res.clearCookie('user')
  res.json({ ok: true })
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
})
