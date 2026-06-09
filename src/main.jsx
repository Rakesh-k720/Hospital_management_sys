import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './i18n/index.js'
import './index.css'
import './styles/print.css'
import { registerSW } from 'virtual:pwa-register'

// Register the PWA service worker to handle background caching & offline caching
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
