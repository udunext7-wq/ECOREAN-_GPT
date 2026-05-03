import React from 'react';
import { createRoot } from 'react-dom/client';
import { CeoDashboard } from '../app/dashboard/CeoDashboard';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CeoDashboard />
  </React.StrictMode>
);
