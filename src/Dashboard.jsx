import React, { useEffect, useState } from 'react'
import VirtualCompanyWidget from './VirtualCompanyWidget.jsx'

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

function Widget({ title, right, children }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h2 className="cardTitle">{title}</h2>
        {right}
      </div>
      <div className="cardBody">{children}</div>
    </div>
  )
}

export default function Dashboard({ build }) {
  // Users widget
  const [users, setUsers] = useState([])
  const [usersErr, setUsersErr] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('user')
  const [editing, setEditing] = useState(null) // {id, name, role}

  // News widget
  const [news, setNews] = useState([])
  const [newsErr, setNewsErr] = useState('')

  // Weather widget
  const [weather, setWeather] = useState(null)
  const [place, setPlace] = useState('')
  const [weatherErr, setWeatherErr] = useState('')

  // Brainstorm widget (static for now)
  const ideas = [
    { title: 'AI Ops for SMBs', desc: 'A lightweight “virtual ops manager” that monitors invoices, cashflow, and deadlines, and nags you before things break.' },
    { title: 'Local Services Marketplace (WhatsApp-first)', desc: 'Book trusted local tradies/services with transparent pricing, all managed via chat and one tap payments.' },
    { title: 'Micro-learning for Professionals', desc: 'Daily 5-min lessons with quizzes for a niche (e.g., sales objections, leadership, or cloud certs) + streaks.' },
    { title: 'Personal Knowledge Concierge', desc: 'Drop links/notes, get weekly summaries + action items, with smart reminders and “what should I do next?” prompts.' },
  ]

  async function loadUsers() {
    setUsersErr('')
    try {
      const data = await api('/api/users')
      setUsers(data.users || [])
    } catch (e) {
      setUsersErr(e.message)
    }
  }

  async function loadNews() {
    setNewsErr('')
    try {
      const data = await api('/api/news')
      setNews(data.items || [])
    } catch (e) {
      setNewsErr(e.message)
    }
  }

  async function loadWeather() {
    setWeatherErr('')

    if (!navigator.geolocation) {
      setWeatherErr('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const w = await api(`/api/weather?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`)
          setWeather(w)
          setPlace(w.place || '')
        } catch (e) {
          setWeatherErr(e.message)
        }
      },
      (err) => {
        setWeatherErr(err.message || 'Location denied')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }

  useEffect(() => {
    loadUsers()
    loadNews()
    loadWeather()
  }, [])

  async function createUser(e) {
    e.preventDefault()
    setUsersErr('')
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name, role }),
      })
      setName('')
      setRole('user')
      await loadUsers()
    } catch (e) {
      setUsersErr(e.message)
    }
  }

  async function saveEdit(e) {
    e.preventDefault()
    setUsersErr('')
    try {
      await api(`/api/users/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editing.name, role: editing.role }),
      })
      setEditing(null)
      await loadUsers()
    } catch (e) {
      setUsersErr(e.message)
    }
  }

  async function delUser(id) {
    if (!confirm('Delete user?')) return
    setUsersErr('')
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' })
      await loadUsers()
    } catch (e) {
      setUsersErr(e.message)
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 16px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Dashboard</h1>
        <div className="muted" style={{ fontSize: 12 }}>Build: {build || '…'}</div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Widget
          title="Users"
          right={
            <div className="pill blue">
              <span className="kpiNum" style={{ fontSize: 14 }}>{users.length}</span>
              <span className="muted">total</span>
            </div>
          }
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {users.map((u) => (
              <div key={u.id} className="row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`dot ${u.role === 'admin' ? 'green' : 'blue'}`} />
                  <div>
                    <div style={{ fontWeight: 700, lineHeight: 1.1 }}>{u.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>#{u.id}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`pill ${u.role === 'admin' ? 'green' : 'blue'}`}>{u.role}</span>
                  <button className="btn" onClick={() => setEditing({ ...u })}>Edit</button>
                  <button className="btn" onClick={() => delUser(u.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="name" required />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
            <button className="btn" onClick={createUser}>Create</button>
          </div>

          {editing ? (
            <div style={{ marginTop: 14 }} className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot purple" />
                <strong>Edit #{editing.id}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="name" required />
                <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option value="admin">admin</option>
                  <option value="user">user</option>
                </select>
                <button className="btn" onClick={saveEdit}>Save</button>
                <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : null}

          {usersErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{usersErr}</pre> : null}
        </Widget>

        <Widget
          title="News feeds"
          right={<button className="btn" onClick={loadNews}>Refresh</button>}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {news.slice(0, 6).map((n, idx) => (
              <a key={n.link} className="row" href={n.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`dot ${idx % 2 === 0 ? 'orange' : 'blue'}`} />
                  <div>
                    <div style={{ fontWeight: 700, lineHeight: 1.15 }}>{n.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{n.source || 'News'}</div>
                  </div>
                </div>
                <span className="pill blue">Read</span>
              </a>
            ))}
          </div>
          {newsErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{newsErr}</pre> : null}
        </Widget>

        <Widget
          title="Weather"
          right={<button className="btn" onClick={loadWeather}>Refresh</button>}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dot green" />
                <div>
                  <div style={{ fontWeight: 750 }}>{place || 'Your location'}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{weather?.time ? `Updated: ${weather.time}` : 'Waiting for location…'}</div>
                </div>
              </div>
              {weather ? <span className="pill green">{Math.round(weather.tempC)}°C</span> : <span className="pill blue">…</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <div className="cardInner" style={{ padding: 14 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Temperature</div>
                <div className="kpi">
                  <div className="kpiNum">{weather ? `${weather.tempC.toFixed(1)}°C` : '—'}</div>
                </div>
              </div>
              <div className="cardInner" style={{ padding: 14 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Wind</div>
                <div className="kpi">
                  <div className="kpiNum">{weather ? `${weather.windKph.toFixed(1)} km/h` : '—'}</div>
                </div>
              </div>
            </div>
          </div>
          {weatherErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{weatherErr}</pre> : null}
        </Widget>

        <Widget title="Virtual company">
          <VirtualCompanyWidget />
        </Widget>

        <Widget title="Brainstorm">
          <div style={{ display: 'grid', gap: 10 }}>
            {ideas.map((i, idx) => (
              <div key={i.title} className="row">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`dot ${idx % 3 === 0 ? 'purple' : idx % 3 === 1 ? 'blue' : 'green'}`} />
                  <div>
                    <div style={{ fontWeight: 800, lineHeight: 1.1 }}>{i.title}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{i.desc}</div>
                  </div>
                </div>
                <span className="pill green">Idea</span>
              </div>
            ))}
          </div>
        </Widget>
      </div>
    </div>
  )
}
