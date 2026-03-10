import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[driver-app] unhandled render error', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: '#07111f', color: '#dbeafe' }}>
          <div style={{ maxWidth: 520, width: '100%', background: 'rgba(2,6,23,0.8)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 16, padding: 24 }}>
            <h1 style={{ margin: 0, fontSize: 24 }}>Erreur inattendue</h1>
            <p style={{ marginTop: 12, lineHeight: 1.5 }}>
              L'application chauffeur a rencontré une erreur. Recharge pour continuer.
            </p>
            <button
              type="button"
              onClick={() => globalThis.location.reload()}
              style={{ marginTop: 18, borderRadius: 10, border: 'none', background: '#22d3ee', color: '#082f49', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
            >
              Recharger
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
