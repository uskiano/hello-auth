import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './Login.jsx'
import Dashboard from './Dashboard.jsx'
import Layout from './Layout.jsx'

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
      <div className="topbar">
        <div className="topbarInner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', display: 'grid', placeItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: 12 }}>J</span>
            </div>
            <div style={{ fontWeight: 700 }}>Juan</div>
            <span className="badge">{authed ? `Logged: ${me.user}` : 'Logged out'}</span>
          </div>

          <div className="search">
            <span className="muted" style={{ fontSize: 12 }}>Search…</span>
            <input aria-label="search" placeholder="" />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {authed ? <button className="btn" onClick={logout}>Log out</button> : null}
            <a className="btn" href="/dashboard" style={{ textDecoration: 'none' }}>Dashboard</a>
          </div>
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
              <Layout title="Project Management">
                <Dashboard build={build} />
              </Layout>
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
