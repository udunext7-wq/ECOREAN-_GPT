import React from 'react';
import { createRoot } from 'react-dom/client';
import { CeoDashboard } from '../app/dashboard/CeoDashboard';
import { AuthenticationGate } from '../app/auth/AuthenticationGate';
import './styles.css';
import './print.css';
import './board-print.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthenticationGate><CeoDashboard /></AuthenticationGate>
  </React.StrictMode>
);
