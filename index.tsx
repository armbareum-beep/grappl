import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';
import { initCapacitor } from './lib/capacitor-init';

// Capacitor 네이티브 플러그인 초기화
initCapacitor();

// ============================================
// 🔄 Service Worker 업데이트 감지 + 자동 리로드
// PWA 사용자도 앱 업데이트 시 자동으로 새 버전 적용
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // SW 업데이트 체크 (페이지 로드 시)
    registration.update();

    // 새 SW가 설치되면 감지
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // 새 SW가 활성화되면 자동 리로드
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          console.log('[SW] New version activated, reloading...');
          window.location.reload();
        }
      });
    });

    // 다른 탭에서 SW가 업데이트되면 이 탭도 리로드
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed, reloading...');
      window.location.reload();
    });
  });
}

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
