import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';
// 데이터 초기화 함수 로드 (전역 함수로 노출)
import './utils/clearAllData';
// 마이그레이션 테스트 함수 로드 (전역 함수로 노출)
import './utils/migrationTest';
// 웹 호환성 어댑터 초기화
import { getElectronAPI, isElectron } from './utils/webAdapter';

// 웹 환경에서 Electron API 폴백 초기화
if (!isElectron()) {
  console.log('🌐 Web environment detected, initializing web adapter...');
  getElectronAPI();
}

// 테마 ID 안전하게 교체 (데이터 보존)
try {
  const CURRENT_THEME_KEY = 'app-current-theme';
  const savedThemeId = localStorage.getItem(CURRENT_THEME_KEY);
  // 기존 'lily'를 'brunia'로 직접 교체
  if (savedThemeId === 'lily') {
    console.log('[main.tsx] Replacing old theme ID "lily" with "brunia"');
    localStorage.setItem(CURRENT_THEME_KEY, 'brunia');
  }
} catch (error) {
  console.error('[main.tsx] Error handling theme ID replacement:', error);
}

// 앱 렌더링 (예외 처리)
try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
  console.log('[main.tsx] App rendered successfully');
} catch (error) {
  console.error('[main.tsx] Fatal error rendering app:', error);
  // 최후의 수단: 기본 HTML 표시
  if (document.body) {
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1>앱 초기화 오류</h1>
        <p>애플리케이션을 시작하는 중 오류가 발생했습니다.</p>
        <p>콘솔을 확인하여 자세한 오류 정보를 확인하세요.</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `;
  }
}

