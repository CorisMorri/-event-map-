import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(bodyParser.json())

const PORT = process.env.PORT || 3000
const DB_FILE = path.join(__dirname, 'participants.json')

// Инициализация JSON-файла
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([]))
}

function readData() {
  const data = fs.readFileSync(DB_FILE, 'utf8')
  return JSON.parse(data)
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

// API: получить всех
app.get('/api/participants', (req, res) => {
  res.json(readData())
})

// API: добавить
app.post('/api/participants', (req, res) => {
  const { name, phone, comment, lat, lng, date } = req.body
  const data = readData()
  const newId = data.length > 0 ? Math.max(...data.map(p => p.id)) + 1 : 1
  
  const newParticipant = { id: newId, name, phone, comment, lat, lng, date }
  data.push(newParticipant)
  writeData(data)
  res.json(newParticipant)
})

// API: удалить
app.delete('/api/participants/:id', (req, res) => {
  const data = readData()
  const filtered = data.filter(p => p.id !== parseInt(req.params.id))
  writeData(filtered)
  res.json({ deleted: req.params.id })
})

// Раздача статики React
const distPath = path.join(__dirname, '..', 'dist')
app.use(express.static(distPath))

// ИСПРАВЛЕНО: вместо '*' теперь '/*'
app.get('/*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// Запуск
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`)
})