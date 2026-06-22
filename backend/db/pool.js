const mysql = require('mysql2/promise')
require('dotenv').config()

// SSL is required for TiDB Cloud but breaks local MySQL.
// We detect which one we're connecting to by checking the host —
// if it's localhost or 127.0.0.1 we skip SSL entirely.
const isLocal = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST)

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: true } }),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool