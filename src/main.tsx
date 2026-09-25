import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'

const isAdminRoute = window.location.pathname.replace(/\/$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? <Admin /> : <App />}
  </StrictMode>,
)
