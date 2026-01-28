const path = require('path')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()

const dataDir = path.join(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'app.db')

const db = new sqlite3.Database(dbPath)

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve({ lastID: this.lastID, changes: this.changes })
    })
  })
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })
}

async function migrate() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `)

  // Seed if empty
  const row = await get('SELECT COUNT(*) as c FROM users')
  if ((row?.c || 0) === 0) {
    await run('INSERT INTO users (name, role) VALUES (?, ?)', ['Juan', 'admin'])
    await run('INSERT INTO users (name, role) VALUES (?, ?)', ['Alice', 'user'])
  }
}

module.exports = { db, run, get, all, migrate, dbPath }
