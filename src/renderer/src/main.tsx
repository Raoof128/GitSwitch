import 'react-diff-view/style/index.css'
import './assets/main.css'

import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('GitSwitch crashed:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: 'monospace',
            color: '#ff3366',
            background: '#0a0a0a',
            height: '100vh'
          }}
        >
          <h1 style={{ color: '#00ffaa', marginBottom: 16 }}>GitSwitch encountered an error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#e0e0e0', marginBottom: 16 }}>
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 16px',
              border: '1px solid #00ffaa',
              background: 'transparent',
              color: '#00ffaa',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.getElementById('root')

if (!window.api && root) {
  root.textContent = 'Preload failed. Check main preload path.'
} else if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
