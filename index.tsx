import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';


import { AuthProvider } from './contexts/AuthContext';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <PayPalScriptProvider options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD", // PayPal is better with USD for global, we'll convert KRW to USD
        intent: "capture"
      }}>
        <App />
      </PayPalScriptProvider>
    </AuthProvider>
  </React.StrictMode>
);
