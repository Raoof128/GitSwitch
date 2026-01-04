import 'react-diff-view/style/index.css'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('root')

if (!window.api && root) {
  root.textContent = 'Preload failed. Check main preload path.'
} else if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
