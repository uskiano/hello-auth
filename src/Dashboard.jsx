import React, { useEffect, useState } from 'react'

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

export default function Dashboard({ build }) {
  const [users, setUsers] = useState([])
  const [err, setErr] = useState('')

  const [name, setName] = useState('')
  const [role, setRole] = useState('user')

  const [editing, setEditing] = useState(null) // {id, name, role}

  async function load() {
    setErr('')
    try {
      const data = await api('/api/users')
      setUsers(data.users || [])
    } catch (e) {
      setErr(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function createUser(e) {
    e.preventDefault()
    setErr('')
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name, role }),
      })
      setName('')
      setRole('user')
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function startEdit(u) {
    setEditing({ ...u })
  }

  async function saveEdit(e) {
    e.preventDefault()
    setErr('')
    try {
      await api(`/api/users/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editing.name, role: editing.role }),
      })
      setEditing(null)
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function delUser(id) {
    if (!confirm('Delete user?')) return
    setErr('')
    try {
      await api(`/api/users/${id}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720 }}>
      <h1>Dashboard</h1>
      <p style={{ color: '#666' }}>Build: {build || '…'}</p>

      <h2>Users</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 160px', gap: 8, alignItems: 'center' }}>
            <div>#{u.id}</div>
            <div>{u.name}</div>
            <div>{u.role}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => startEdit(u)}>Edit</button>
              <button onClick={() => delUser(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 24 }}>Create user</h3>
      <form onSubmit={createUser} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="name" required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
        <button type="submit">Create</button>
      </form>

      {editing ? (
        <>
          <h3 style={{ marginTop: 24 }}>Edit user #{editing.id}</h3>
          <form onSubmit={saveEdit} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="name" required />
            <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
              <option value="admin">admin</option>
              <option value="user">user</option>
            </select>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditing(null)}>Cancel</button>
          </form>
        </>
      ) : null}

      {err ? <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 16 }}>{err}</pre> : null}
    </div>
  )
}
