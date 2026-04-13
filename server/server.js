const express = require('express')
const Database = require('better-sqlite3')
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')

const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))

// ПОРТ — берем из переменной окружения (Timeweb дает свой порт)
const PORT = process.env.PORT || 3000

// Жесткая санитизация
function sanitize(input) {
  if (!input) return ''
  let str = String(input)
  str = str.replace(/<[^>]*>/g, '')
  str = str.replace(/[<>]/g, '')
  str = str.replace(/&/g, '')
  str = str.replace(/['"]/g, '')
  str = str.replace(/[\[\]{}()`;]/g, '')
  str = str.replace(/=/g, '')
  str = str.replace(/javascript/gi, '')
  str = str.replace(/on\w+/gi, '')
  str = str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s\.\,\!\?\-\+]/g, '')
  str = str.trim().slice(0, 200)
  return str || 'Без имени'
}

// Подключение к БД (файл создастся в корне приложения)
let db
try {
  db = new Database('./participants.db')
  console.log('✅ База данных подключена')
} catch (err) {
  console.error('❌ Ошибка подключения к БД:', err.message)
  process.exit(1)
}

// Создание таблицы
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      comment TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      date TEXT NOT NULL
    )
  `)
  console.log('✅ Таблица participants готова')
} catch (err) {
  console.error('❌ Ошибка создания таблицы:', err.message)
}

// API: получить всех участников
app.get('/api/participants', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM participants').all()
    res.json(rows)
  } catch (err) {
    console.error('GET /api/participants error:', err)
    res.status(500).json({ error: err.message })
  }
})

// API: добавить участника
app.post('/api/participants', (req, res) => {
  try {
    let { name, phone, comment, lat, lng, date } = req.body
    
    name = sanitize(name)
    phone = sanitize(phone)
    comment = sanitize(comment)
    
    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' })
    }
    if (!phone || phone.length < 5) {
      return res.status(400).json({ error: 'Введите корректный телефон' })
    }
    
    const stmt = db.prepare(`
      INSERT INTO participants (name, phone, comment, lat, lng, date) 
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const info = stmt.run(name, phone, comment, lat, lng, date)
    
    res.json({ 
      id: info.lastInsertRowid,
      name,
      phone,
      comment,
      lat,
      lng,
      date
    })
  } catch (err) {
    console.error('POST /api/participants error:', err)
    res.status(500).json({ error: err.message })
  }
})

// API: удалить участника
app.delete('/api/participants/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM participants WHERE id = ?')
    const result = stmt.run(req.params.id)
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Участник не найден' })
    }
    res.json({ deleted: req.params.id })
  } catch (err) {
    console.error('DELETE /api/participants error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Раздача статики React (папка dist после сборки)
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// Все остальные запросы отдаем index.html (для React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`)
  console.log(`📍 API доступен: http://0.0.0.0:${PORT}/api/participants`)
})