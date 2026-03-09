import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';
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

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from './lib/react-query';
import { indexedDBPersister, CACHE_MAX_AGE } from './lib/query-persister';

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: indexedDBPersister,
        maxAge: CACHE_MAX_AGE,
        buster: import.meta.env.VITE_APP_VERSION || '1.0.0', // 버전 바뀌면 캐시 무효화
      }}
    >
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
    </PersistQueryClientProvider>
  </React.StrictMode>
);
