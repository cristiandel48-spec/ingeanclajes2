import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Root render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: 24 }}>
          <div style={{ maxWidth: 920, margin: '0 auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: '#b91c1c', textTransform: 'uppercase' }}>
              Error De Arranque
            </div>
            <h1 style={{ margin: '10px 0 8px', fontSize: 24 }}>La app no pudo cargar</h1>
            <p style={{ margin: 0, color: '#475569' }}>
              Copia este mensaje y te lo corrijo enseguida.
            </p>
            <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#0f172a', color: '#e2e8f0', borderRadius: 12, padding: 16, overflow: 'auto' }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
)
