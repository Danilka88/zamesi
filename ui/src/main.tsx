// [M-UI][MAIN][START_BLOCK]
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DemoModeProvider } from './context/DemoModeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DemoModeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DemoModeProvider>
  </React.StrictMode>,
)
// = [M-UI][MAIN][END_BLOCK]
