import React from 'react';
import ReactDOM from 'react-dom/client';
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
})();
