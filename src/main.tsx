// Polyfill Node's Buffer so libraries like @gradio/client can run in the
// browser without 'Buffer is not defined'. Must run before any of those
// imports execute, hence top of main.
import { Buffer } from 'buffer';
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

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
