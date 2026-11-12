import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root'), {
  onCaughtError() {
    // A route error can carry a private report URL or API response.
    console.error('NextSkill could not load or render a route.')
  },
}).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
