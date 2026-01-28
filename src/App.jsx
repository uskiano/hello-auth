import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'

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

function AppInner() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [build, setBuild] = useState('')

  async function refreshMe() {
    try {
      const data = await api('/api/me')
      setMe(data)
    } catch {
      setMe(null)
    }
  }

  async function refreshBuild() {
    try {
      const data = await api('/api/build')
      setBuild(data.build || '')
    } catch {
      setBuild('')
    }
  }

  useEffect(() => {
    refreshMe()
    refreshBuild()
  }, [])

  async function logout() {
    await api('/api/logout', { method: 'POST' })
    await refreshMe()
    navigate('/')
  }

  const authed = !!me?.user

  return (
    <div>
      <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'system-ui' }}>{authed ? `Logged in: ${me.user}` : 'Not logged in'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {authed ? <button onClick={logout}>Log out</button> : null}
          <a href="/dashboard">Dashboard</a>
        </div>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            authed ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login
                onLoggedIn={async () => {
                  await refreshMe()
                  navigate('/dashboard')
                }}
              />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            authed ? (
              <Dashboard build={build} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to={authed ? '/dashboard' : '/'} replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
