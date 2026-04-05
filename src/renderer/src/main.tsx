import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('[3DPF] Starting renderer...')

// Lazy import to catch errors
import('./App')
  .then(({ App }) => {
    console.log('[3DPF] App module loaded, rendering...')
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
    console.log('[3DPF] Render called')
  })
  .catch((err) => {
    console.error('[3DPF] Failed to load App:', err)
    document.getElementById('root')!.innerHTML = `
      <div style="color: red; padding: 40px; font-family: monospace;">
        <h1>Load Error</h1>
        <pre>${err.message}</pre>
        <pre>${err.stack}</pre>
      </div>
    `
  })
