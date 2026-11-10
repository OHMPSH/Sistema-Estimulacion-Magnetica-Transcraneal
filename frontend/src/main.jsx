import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
// Bootstrap e iconos empaquetados con Vite: no dependen de un CDN
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
