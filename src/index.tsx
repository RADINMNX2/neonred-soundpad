import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// StrictMode is good, but can cause double-invocations in dev which might confuse audio context handling slightly.
// Keeping it for best practices.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);