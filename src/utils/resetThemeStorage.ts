/**
 * 테마 관련 localStorage를 초기화하는 유틸리티 함수
 * 개발 및 디버깅 목적으로 사용
 */

const THEME_STORAGE_KEY = 'app-themes';
const CURRENT_THEME_KEY = 'app-current-theme';

export function resetThemeStorage() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.removeItem(CURRENT_THEME_KEY);
    console.log('[ThemeStorage] localStorage cleared successfully');
    return true;
  } catch (error) {
    console.error('[ThemeStorage] Failed to clear localStorage:', error);
    return false;
  }
}

// 브라우저 콘솔에서 사용할 수 있도록 전역으로 노출 (개발 모드만)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).resetThemeStorage = resetThemeStorage;
  console.log('[ThemeStorage] resetThemeStorage() function is available in console');
}







