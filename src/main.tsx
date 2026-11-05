import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installLocalApi } from './localApi';

// Static build (GitHub Pages): no server, so answer /api calls in the browser.
if (import.meta.env.VITE_STATIC === 'true') installLocalApi();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
