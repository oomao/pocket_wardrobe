import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initDB } from './services/storage';
import './index.css';

(async () => {
  await initDB();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  if ('serviceWorker' in navigator) {
    registerSW({ immediate: true });
  }
})();
