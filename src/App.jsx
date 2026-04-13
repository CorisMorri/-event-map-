// Адаптивные стили для мобильных
const mobileStyles = `
  @media (max-width: 768px) {
    .leaflet-control-zoom {
      bottom: 20px !important;
      top: auto !important;
    }
    .leaflet-popup-content {
      min-width: 200px !important;
    }
  }
`
// Добавляем стили в head
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = mobileStyles
  document.head.appendChild(style)
}

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet.heat'
function escapeText(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
// Функция для безопасного отображения текста
function escapeHtml(text) {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
// Фикс иконок
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


// Тепловая карта
function HeatmapLayer({ markers }) {
  const map = useMap()
  
  useEffect(() => {
    if (!map || !markers.length) return
    
    const points = markers.map(m => [m.lat, m.lng, 1])
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      minOpacity: 0.3
    })
    heatLayer.addTo(map)
    
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, markers])
  
  return null
}

// Форма регистрации
function RegistrationForm({ position, onClose, onSave }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа'
    }
    if (!phone.trim() || phone.trim().length < 5) {
      newErrors.phone = 'Введите корректный телефон'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
          lat: position.lat,
          lng: position.lng,
          date: new Date().toLocaleString()
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка сервера')
      }
      
      const savedMarker = await response.json()
      onSave(savedMarker)
    } catch (error) {
      alert(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Регистрация участника</h3>
        <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
          📍 {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Ваше имя *"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors({ ...errors, name: null })
            }}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: errors.name ? '4px' : '12px', 
              borderRadius: '8px', 
              border: errors.name ? '1px solid #ef4444' : '1px solid #ccc',
              boxSizing: 'border-box'
            }}
          />
          {errors.name && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 12px 0' }}>{errors.name}</p>}
          
          <input
            type="tel"
            placeholder="Телефон или Telegram *"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (errors.phone) setErrors({ ...errors, phone: null })
            }}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: errors.phone ? '4px' : '12px', 
              borderRadius: '8px', 
              border: errors.phone ? '1px solid #ef4444' : '1px solid #ccc',
              boxSizing: 'border-box'
            }}
          />
          {errors.phone && <p style={{ color: '#ef4444', fontSize: '12px', margin: '0 0 12px 0' }}>{errors.phone}</p>}
          
          <textarea
            placeholder="Комментарий (опционально)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
            style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Отмена</button>
            <button 
              type="submit" 
              disabled={isLoading}
              style={{ 
                flex: 1, 
                padding: '10px', 
                borderRadius: '8px', 
                border: 'none', 
                background: isLoading ? '#9ca3af' : '#3b82f6', 
                color: 'white', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold' 
              }}
            >
              {isLoading ? 'Сохранение...' : 'Подтвердить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Компонент для кликов по карте с формой
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  })
  return null
}

function App() {
  const [markers, setMarkers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [tempPosition, setTempPosition] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка маркеров из БД
  useEffect(() => {
    fetch('/api/participants')
      .then(res => res.json())
      .then(data => {
        setMarkers(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Ошибка загрузки:', err)
        setIsLoading(false)
      })
  }, [])

  const handleMapClick = (position) => {
    setTempPosition(position)
    setShowForm(true)
  }

  const saveMarker = (newMarker) => {
    setMarkers([...markers, newMarker])
    setShowForm(false)
    setTempPosition(null)
  }

  const deleteMarker = async (id, event) => {
    event?.stopPropagation()
    if (!confirm('Удалить эту метку?')) return
    
    try {
      const response = await fetch(`/api/participants${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setMarkers(markers.filter(m => m.id !== id))
      } else {
        alert('Ошибка при удалении')
      }
    } catch (error) {
      alert('Ошибка сервера')
    }
  }

  if (isLoading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Загрузка карты...</div>
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ШАПКА */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 1001,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>📍</span>
          <span style={{ fontWeight: 'bold', fontSize: '18px' }}>EventMap</span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>Сервис регистрации участников</span>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '14px' }}>
            👥 {markers.length} участников
          </span>
        </div>
      </div>
  
      {/* КАРТА */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer
          center={[55.751244, 37.618423]}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClickHandler onMapClick={handleMapClick} />
          <HeatmapLayer markers={markers} />
          
          <MarkerClusterGroup 
            chunkedLoading
            iconCreateFunction={(cluster) => {
              const count = cluster.getChildCount();
              return L.divIcon({
                html: `<div style="background-color: #3b82f6; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">${count}</div>`,
                className: 'custom-cluster',
                iconSize: L.point(40, 40)
              });
            }}
          >
            {markers.map(marker => (
              <Marker key={marker.id} position={[marker.lat, marker.lng]}>
                <Popup>
                  <div>
                    <strong>{escapeText(marker.name)}</strong><br />
                    📞 {escapeText(marker.phone)}<br />
                    {marker.comment && <><i>"{escapeText(marker.comment)}"</i><br /></>}
                    <span style={{ fontSize: '11px', color: '#999' }}>{escapeText(marker.date)}</span><br />
                    <button 
                      onClick={(e) => deleteMarker(marker.id, e)}
                      style={{ marginTop: '8px', padding: '4px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
  
        {/* ИНСТРУКЦИЯ — сделали компактнее */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '30px',
          zIndex: 1000,
          fontSize: '12px',
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <span>📍 <strong>Клик</strong> — добавить</span>
          <span>🔵 <strong>Круги</strong> — кластеры</span>
          <span>🗑️ <strong>Клик по метке</strong> — удалить</span>
        </div>
      </div>
  
      {/* ФОРМА РЕГИСТРАЦИИ */}
      {showForm && tempPosition && (
        <RegistrationForm
          position={tempPosition}
          onClose={() => {
            setShowForm(false)
            setTempPosition(null)
          }}
          onSave={saveMarker}
        />
      )}
    </div>
  )
}

export default App