import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Sayı kutucukları üzerinde fare tekerleği ile değer değişmesini engelle —
// kullanıcı sadece klavyeden yazarak değiştirebilsin.
document.addEventListener(
  'wheel',
  (e) => {
    const target = e.target;
    if (
      target instanceof HTMLInputElement &&
      target.type === 'number' &&
      document.activeElement === target
    ) {
      e.preventDefault();
    }
  },
  { passive: false, capture: true }
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
