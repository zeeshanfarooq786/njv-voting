import React, { useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { ParticlesProvider } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import App from './App.jsx'
import './index.css'

function Root() {
  const init = useCallback(async (engine) => {
    await loadSlim(engine)
  }, [])

  return (
    <ParticlesProvider init={init}>
      <App />
    </ParticlesProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
