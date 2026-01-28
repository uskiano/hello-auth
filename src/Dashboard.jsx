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
        <Widget title="Users">
          <div style={{ display: 'grid', gap: 8 }}>
            {users.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 90px 150px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid #f2f2f2',
                }}
              >
                <div className="muted">#{u.id}</div>
                <div>{u.name}</div>
                <div className="muted">{u.role}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => setEditing({ ...u })}>Edit</button>
                  <button className="btn" onClick={() => delUser(u.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={createUser} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="name" required />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
            <button className="btn" type="submit">Create</button>
          </form>

          {editing ? (
            <form onSubmit={saveEdit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
              <strong> Edit #{editing.id}</strong>
              <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="name" required />
              <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option value="admin">admin</option>
                <option value="user">user</option>
              </select>
              <button className="btn" type="submit">Save</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
            </form>
          ) : null}

          {usersErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{usersErr}</pre> : null}
        </Widget>

        <Widget title="News feeds">
          <div style={{ display: 'grid', gap: 10 }}>
            {news.slice(0, 6).map((n) => (
              <a key={n.link} href={n.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontWeight: 650, lineHeight: 1.25 }}>{n.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{n.source || ''}</div>
              </a>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn" onClick={loadNews}>Refresh</button>
          </div>
          {newsErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{newsErr}</pre> : null}
        </Widget>

        <Widget title="Weather">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 650 }}>{place || 'Your location'}</div>
            {weather ? (
              <>
                <div>Temp: {weather.tempC}°C</div>
                <div>Wind: {weather.windKph} km/h</div>
                <div style={{ color: '#666', fontSize: 12 }}>Updated: {weather.time}</div>
              </>
            ) : (
              <div style={{ color: '#666' }}>Loading…</div>
            )}
            <div style={{ marginTop: 10 }}>
              <button className="btn" onClick={loadWeather}>Refresh</button>
            </div>
          </div>
          {weatherErr ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 10 }}>{weatherErr}</pre> : null}
        </Widget>

        <Widget title="Virtual company">
          <VirtualCompanyWidget />
        </Widget>

        <Widget title="Brainstorm">
          <div style={{ display: 'grid', gap: 12 }}>
            {ideas.map((i) => (
              <div key={i.title}>
                <div style={{ fontWeight: 700 }}>{i.title}</div>
                <div style={{ color: '#444' }}>{i.desc}</div>
              </div>
            ))}
          </div>
        </Widget>
      </div>
    </div>
  )
}
