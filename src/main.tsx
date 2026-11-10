import { PwaControls } from './features/pwa/PwaControls';
import { registerPwa } from './features/pwa/register';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { App } from './app/App';
import './styles/index.css';

registerPwa();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PwaControls />
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
