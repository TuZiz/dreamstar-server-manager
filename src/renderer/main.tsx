import React from 'react';
import ReactDOM from 'react-dom/client';
import './types/api';
import './styles/index.css';
import { App } from './App';
import { installWebDreamstarApi } from './api/webDreamstar';

installWebDreamstarApi();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
