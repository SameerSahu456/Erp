import './styles/index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'

window.addEventListener('error', (e) => {
  if (
    e.message?.includes('Failed to fetch dynamically imported module') ||
    e.message?.includes('Loading chunk')
  ) {
    const reloaded = sessionStorage.getItem('chunk-reload')
    if (!reloaded) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.reload()
    }
  }
})

sessionStorage.removeItem('chunk-reload')

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Could not find root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
