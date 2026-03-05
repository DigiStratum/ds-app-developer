import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initPrefs } from '@digistratum/ds-core';
import App from './App';
import './styles/globals.css';
import '@digistratum/ds-icons/dist/icons.css';
import './i18n/config';

// Apply stored preferences (theme, language) before first render
initPrefs();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
