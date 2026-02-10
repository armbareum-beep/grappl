import type { CapacitorConfig } from '@capacitor/cli';

// 개발 모드: LIVE_RELOAD=true npm run cap:sync 로 활성화
const isLiveReload = process.env.LIVE_RELOAD === 'true';
const devServerUrl = 'http://172.30.1.43:5173'; // 로컬 IP (와이파이 변경시 업데이트 필요)

const config: CapacitorConfig = {
  appId: 'com.grapplay.app',
  appName: 'Grapplay',
  webDir: 'dist',

  // 서버 설정
  server: {
    // 라이브 리로드 모드일 때 개발 서버로 연결
    ...(isLiveReload && { url: devServerUrl }),
    cleartext: true, // HTTP 허용 (개발용)
  },

  // Android 설정
  android: {
    allowMixedContent: true, // HTTP/HTTPS 혼합 허용
    backgroundColor: '#09090b', // 앱 배경색
  },

  // iOS 설정
  ios: {
    backgroundColor: '#09090b',
    contentInset: 'automatic', // Safe area 자동 처리
    preferredContentMode: 'mobile', // 모바일 뷰 강제
  },

  // 플러그인 설정
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#09090b',
      showSpinner: false,
    },
  },
};

export default config;
