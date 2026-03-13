import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Migrate localStorage from old key to new key
const OLD_KEY = 'swiss-tennis-storage';
const NEW_KEY = 'tennis-match-maker-storage';
if (!localStorage.getItem(NEW_KEY) && localStorage.getItem(OLD_KEY)) {
  localStorage.setItem(NEW_KEY, localStorage.getItem(OLD_KEY)!);
  localStorage.removeItem(OLD_KEY);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
