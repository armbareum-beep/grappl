import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';
import { initCapacitor } from './lib/capacitor-init';

// Capacitor 네이티브 플러그인 초기화
initCapacitor();

// Sentry 에러 모니터링 - 지연 초기화 (FCP 개선)
if (import.meta.env.PROD) {
  // Defer Sentry loading until after initial render
  setTimeout(() => {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: "https://538987de3a8006ffe952f2180366b816@o4510848021692416.ingest.us.sentry.io/4510848027918336",
        environment: import.meta.env.MODE,
        enabled: true,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
      });
    });
  }, 3000); // Load Sentry 3 seconds after initial render
}

import { AuthProvider } from './contexts/AuthContext';

import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query'; // Ensure path is correct

// Lazy load dev tools only in development
const ReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-query-devtools').then((mod) => ({
        default: mod.ReactQueryDevtools,
      }))
    )
  : () => null;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PayPalScriptProvider deferLoading={true} options={{
          clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
          currency: "USD",
          intent: "capture"
        }}>
          <App />
        </PayPalScriptProvider>
      </AuthProvider>
      {import.meta.env.DEV && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
