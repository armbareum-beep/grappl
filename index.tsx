import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App';
import './src/index.css';

// Sentry 에러 모니터링 초기화
Sentry.init({
  dsn: "https://538987de3a8006ffe952f2180366b816@o4510848021692416.ingest.us.sentry.io/4510848027918336",
  environment: import.meta.env.MODE, // 'development' or 'production'
  enabled: import.meta.env.PROD, // 프로덕션에서만 활성화
  tracesSampleRate: 0.1, // 성능 모니터링 10% 샘플링
  replaysSessionSampleRate: 0, // 리플레이 비활성화 (무료 플랜)
  replaysOnErrorSampleRate: 0,
});

import { AuthProvider } from './contexts/AuthContext';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/react-query'; // Ensure path is correct

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PayPalScriptProvider options={{
          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: "USD",
          intent: "capture" // Note: "capture" is default, but "authorize" is also possible
        }}>
          <App />
        </PayPalScriptProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
