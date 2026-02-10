import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export const initCapacitor = async () => {
  // 네이티브 앱에서만 실행
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 상태바 스타일 설정 (어두운 배경에 밝은 아이콘)
    await StatusBar.setStyle({ style: Style.Dark });

    // 상태바 배경색 설정
    await StatusBar.setBackgroundColor({ color: '#09090b' });

    // Android에서 상태바 오버레이 (컨텐츠가 상태바 아래로 확장)
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (error) {
    console.warn('StatusBar plugin error:', error);
  }
};

// 플랫폼 확인 유틸리티
export const isNativeApp = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform();
