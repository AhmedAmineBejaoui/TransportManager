import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import './App.css'

// Configuration API - À adapter selon ton réseau local
// En production, utiliser l'IP du serveur ou un domaine
// 🔒 HTTPS sur le port 5443
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://localhost:5443').replace(/\/$/, '')
const REQUEST_TIMEOUT_MS = 10000

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

function App() {
  const [scanResult, setScanResult] = useState(null)
  const [isScanning, setIsScanning] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [serverStatus, setServerStatus] = useState('checking') // 'checking', 'online', 'offline'
  const [errorDetails, setErrorDetails] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Récupérer la préférence sauvegardée ou utiliser le mode sombre par défaut
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const scannerRef = useRef(null)

  // Appliquer le thème au chargement et lors des changements
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode')
      document.body.classList.remove('light-mode')
    } else {
      document.body.classList.add('light-mode')
      document.body.classList.remove('dark-mode')
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Toggle theme function
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  // Test de connexion au serveur au démarrage
  useEffect(() => {
    const checkServer = async () => {
      console.log('Checking server at:', API_BASE_URL)
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/ping`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
        })
        
        console.log('Server response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Server response:', data)
          setServerStatus('online')
          setError(null)
          setErrorDetails('')
        } else {
          setServerStatus('offline')
          setErrorDetails(`HTTP ${response.status}`)
        }
      } catch (err) {
        console.error('Server check failed:', err?.name, err?.message)
        setServerStatus('offline')
        setErrorDetails(err?.message || err?.name || 'Erreur inconnue')
      }
    }
    
    checkServer()
    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkServer, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isScanning && !scannerRef.current && serverStatus === 'online') {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      )

      scanner.render(onScanSuccess, onScanError)
      scannerRef.current = scanner
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [isScanning, serverStatus])

  const onScanSuccess = async (decodedText) => {
    // Arrêter le scanner pendant le traitement
    if (scannerRef.current) {
      await scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
    setIsLoading(true)
    setError(null)

    try {
      // Parser le QR code (peut être un JSON stringifié ou un objet)
      let qrPayload
      try {
        qrPayload = JSON.parse(decodedText)
      } catch {
        qrPayload = decodedText
      }

      // Appeler l'endpoint de scan/validation du chauffeur
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/reservations/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrCode: qrPayload, autoCheckin: true })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}`)
      }

      const result = {
        success: data.valid === true,
        ...data,
        scannedAt: new Date().toLocaleTimeString('fr-FR')
      }

      setScanResult(result)
      
      // Ajouter à l'historique
      setScanHistory(prev => [result, ...prev].slice(0, 10))

    } catch (err) {
      setError('Erreur de connexion au serveur. Vérifiez votre connexion réseau.')
      console.error('Scan error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const onScanError = (errorMessage) => {
    // Ignorer les erreurs de scan normales (pas de QR détecté)
    if (!errorMessage.includes('NotFoundException')) {
      console.warn('Scan error:', errorMessage)
    }
  }

  const resetScanner = () => {
    setScanResult(null)
    setError(null)
    setIsScanning(true)
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Header */}
      <header className="app-header">
        <div className="header-top">
          <div className="logo-section">
            <div className="logo-icon">🚌</div>
            <div>
              <h1>TransportPro</h1>
              <p className="subtitle">Scanner Chauffeur</p>
            </div>
          </div>
          {/* Bouton de basculement de thème */}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        {/* Indicateur de statut serveur */}
        <div className={`server-status ${serverStatus}`}>
          {serverStatus === 'checking' && '🔄 Connexion...'}
          {serverStatus === 'online' && '🟢 Serveur connecté'}
          {serverStatus === 'offline' && '🔴 Serveur hors ligne'}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Écran de connexion en cours */}
        {serverStatus === 'checking' && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Connexion au serveur...</p>
            <p className="server-url">{API_BASE_URL}</p>
          </div>
        )}

        {/* Écran serveur hors ligne */}
        {serverStatus === 'offline' && (
          <div className="result-card error">
            <div className="result-icon">❌</div>
            <h2>Erreur de connexion</h2>
            <p>Impossible de se connecter au serveur.</p>
            <p className="server-url">{API_BASE_URL}</p>
            {errorDetails && <p className="error-details">Détails: {errorDetails}</p>}
            <button className="btn-primary" onClick={() => {
              setServerStatus('checking')
              setErrorDetails('')
              window.location.reload()
            }}>
              Réessayer
            </button>
          </div>
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Vérification en cours...</p>
          </div>
        )}

        {error && (
          <div className="result-card error">
            <div className="result-icon">❌</div>
            <h2>Erreur de connexion</h2>
            <p>{error}</p>
            <button className="btn-primary" onClick={resetScanner}>
              Réessayer
            </button>
          </div>
        )}

        {!scanResult && !error && isScanning && (
          <div className="scanner-container">
            <div className="scanner-instructions">
              <p>📷 Placez le QR code du ticket devant la caméra</p>
            </div>
            <div id="qr-reader" className="qr-reader"></div>
            
            {/* Mini historique */}
            {scanHistory.length > 0 && (
              <div className="scan-history">
                <h4>Derniers scans</h4>
                {scanHistory.slice(0, 3).map((scan, idx) => (
                  <div key={idx} className={`history-item ${scan.success ? 'valid' : 'invalid'}`}>
                    <span className="history-icon">{scan.success ? '✅' : '❌'}</span>
                    <span className="history-name">
                      {scan.reservation?.passengerName || scan.reservation?.client_id || 'Inconnu'}
                    </span>
                    <span className="history-time">{scan.scannedAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {scanResult && (
          <div className={`result-card ${scanResult.success ? 'success' : 'invalid'}`}>
            <div className="result-icon">
              {scanResult.success ? '✅' : '❌'}
            </div>
            
            <h2 className="result-title">
              {scanResult.success 
                ? (scanResult.alreadyChecked ? 'DÉJÀ EMBARQUÉ' : 'TICKET VALIDÉ')
                : 'TICKET REFUSÉ'
              }
            </h2>

            {scanResult.success && scanResult.reservation && (
              <div className="ticket-details">
                <div className="detail-row">
                  <span className="label">👤 Passager</span>
                  <span className="value">
                    {scanResult.reservation.passengerName || 
                     scanResult.reservation.passenger_name ||
                     'N/A'}
                  </span>
                </div>
                {scanResult.trip && (
                  <div className="detail-row">
                    <span className="label">🚏 Trajet</span>
                    <span className="value">
                      {scanResult.trip.point_depart} → {scanResult.trip.point_arrivee}
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">📅 Date</span>
                  <span className="value">
                    {scanResult.payload?.date || 
                     new Date(scanResult.reservation.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">🕐 Heure</span>
                  <span className="value">{scanResult.payload?.time || 'N/A'}</span>
                </div>
                {scanResult.payload?.seat_number && (
                  <div className="detail-row">
                    <span className="label">💺 Siège</span>
                    <span className="value">{scanResult.payload.seat_number}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">🎫 Statut</span>
                  <span className={`status-badge ${scanResult.reservation.statut}`}>
                    {scanResult.reservation.statut === 'confirme' ? 'Confirmé' : 
                     scanResult.reservation.statut === 'annule' ? 'Annulé' : 
                     scanResult.reservation.statut === 'pending_payment' ? 'Non payé' :
                     scanResult.reservation.statut}
                  </span>
                </div>
                {scanResult.checkedIn && (
                  <div className="checkin-badge">
                    ✅ Check-in effectué automatiquement
                  </div>
                )}
              </div>
            )}

            {!scanResult.success && (
              <div className="error-message">
                <p>{scanResult.error || 'Ce ticket n\'est pas valide'}</p>
                {scanResult.issues && scanResult.issues.length > 0 && (
                  <ul className="issues-list">
                    {scanResult.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button className="btn-primary" onClick={resetScanner}>
              🔄 Scanner un autre ticket
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p>TransportPro © 2025 - v1.0</p>
      </footer>
    </div>
  )
}

export default App
