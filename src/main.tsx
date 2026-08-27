import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyStoredTheme } from './lib/use-theme';
import './index.css';

applyStoredTheme();

const container = document.getElementById('root');
if (container === null) throw new Error('Falta el contenedor #root');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
