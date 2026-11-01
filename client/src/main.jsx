import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';

// Useful error logging for diagnostics
window.addEventListener('error', (e) => {
  console.error('[ShareMeal Runtime Error]:', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[ShareMeal Unhandled Promise Rejection]:', e.reason);
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

