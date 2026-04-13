const express = require('express')
const Database = require('better-sqlite3')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))

// ЖЕСТКАЯ САНИТИЗАЦИЯ — удаляем ВСЕ подозрительные символы
function sanitize(input) {
  if (!input) return ''
  
  let str = String(input)
  
  // 1. Удаляем HTML-теги (самый надежный способ)
  str = str.replace(/<[^>]*>/g, '')
  
  // 2. Удаляем все опасные символы
  str = str
    .replace(/[<>]/g, '')           // Удаляем < и >
    .replace(/&/g, '')              // Удаляем &
    .replace(/['"]/g, '')           // Удаляем кавычки
    .replace(/[\[\]{}()`;]/g, '')   // Удаляем скобки и спецсимволы
    .replace(/=/g, '')              // Удаляем =
    .replace(/javascript/gi, '')    // Удаляем javascript:
    .replace(/on\w+/gi, '')         // Удаляем onclick, onload и т.д.
  
  // 3. Оставляем только буквы, цифры, пробелы и базовые знаки
  str = str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s\.\,\!\?\-\+]/g, '')
  
  // 4. Ограничиваем длину и обрезаем
  str = str.trim().slice(0, 200)
  
  return str || 'Без имени'
}

// Подключение к БД
const db = new Database('./participants.db')

// Очистим базу от старых вредоносных записей
db.exec(`DELETE FROM participants WHERE name LIKE '%script%' OR comment LIKE '%script%'`)

// Создание таблицы
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

// Получить всех участников
app.get('/api/participants', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM participants').all()
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Добавить участника
app.post('/api/participants', (req, res) => {
  let { name, phone, comment, lat, lng, date } = req.body
  
  // Жесткая санитизация
  name = sanitize(name)
  phone = sanitize(phone)
  comment = sanitize(comment)
  
  // Валидация
  if (!name || name.length < 2) {
    return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' })
  }
  if (!phone || phone.length < 5) {
    return res.status(400).json({ error: 'Введите корректный телефон' })
  }
  
  try {
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
    res.status(500).json({ error: err.message })
  }
})

// Удалить участника
app.delete('/api/participants/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM participants WHERE id = ?')
    const result = stmt.run(req.params.id)
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Участник не найден' })
    }
    res.json({ deleted: req.params.id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.listen(5000, () => {
  console.log('Сервер запущен на http://localhost:5000')
})