import React, { useState } from 'react'

async function api(path, opts) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return res.json()
  return res.text()
}

export default function Login({ onLoggedIn }) {
  const [username, setUsername] = useState('juan')
  const [password, setPassword] = useState('secret123')
  const [err, setErr] = useState('')

  async function login(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      onLoggedIn?.()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 520 }}>
      <h1>Login</h1>
      <form onSubmit={login} style={{ display: 'grid', gap: 12 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" type="password" />
        <button type="submit">Log in</button>
      </form>
      {err ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{err}</pre> : null}
      <p style={{ marginTop: 24, color: '#666' }}>Demo creds: juan / secret123</p>
    </div>
  )
}
