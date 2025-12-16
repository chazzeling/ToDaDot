/**
 * 모든 앱 데이터를 초기화하는 유틸리티 함수
 * exe 패키징 전 초기화용
 * 
 * ⚠️ 주의: 이 함수는 사용자 데이터(투두, 일기, 메모, 일정, 스티커 등)만 삭제합니다.
 * 다음은 삭제 대상에서 제외됩니다:
 * - Google OAuth 인증 토큰 (google-token.json 파일)
 * - Firebase 인증 토큰 (firebase-token.json 파일)
 * - 테마 설정 (커스텀 테마, 현재 테마)
 * - OS 보안 저장소(Keytar)에 저장된 모든 데이터 (현재 코드에서는 Keytar 사용 안 함)
 */

export async function clearAllAppData() {
  // localStorage에서 모든 앱 데이터 삭제
  // ⚠️ Google OAuth 토큰은 localStorage가 아닌 파일 시스템(google-token.json)에 저장되므로 삭제되지 않습니다.
  const keysToRemove = [
    // 투두
    'eisenhower-todos',
    
    // 일기 및 메모
    'diaries',
    'memos',
    
    // 일정/이벤트
    'events',
    'event-categories',
    
    // 카테고리
    'categories',
    
    // 무드 트래커
    'mood-tracker',
    'mood-custom-colors',
    
    // 매트릭스 색상
    'quadrant-colors',
    'quadrant-color-preset',
    
    // 스티커 레이아웃 (로컬스토리지)
    'sticker-layouts',
    'stickers-Calendar',
    'stickers-Matrix',
    'stickers-Category',
    'stickers-Record',
    
    // 헤더 이미지 (로컬스토리지)
    'header-image',
    
    // 테마 (커스텀 테마만 삭제, 현재 테마는 유지)
    // 'app-themes', // 주석 처리: 커스텀 테마만 삭제하려면 이 키는 제외
    // 'app-current-theme', // 주석 처리: 현재 테마 설정은 유지
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`✅ Removed localStorage: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${key}:`, error);
    }
  });

  // SQLite 데이터베이스 초기화 (Electron IPC를 통해)
  // ⚠️ 이 함수는 memos, header_images, calendar_stickers, sticker_layouts 테이블만 삭제합니다.
  // ⚠️ Google OAuth 토큰 파일(google-token.json) 및 Firebase 토큰 파일(firebase-token.json)은 삭제하지 않습니다.
  if (window.electronAPI && window.electronAPI.dbClearAllData) {
    try {
      const result = await window.electronAPI.dbClearAllData();
      if (result.success) {
        console.log('✅ All database data cleared!');
      } else {
        console.error('❌ Failed to clear database:', result.error);
      }
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
    }
  } else {
    console.log('⚠️ Note: Database clearing is not available. Database data should be cleared separately.');
  }

  console.log('✅ All user data cleared!');
  console.log('⚠️ Note: Google OAuth tokens and Firebase tokens are preserved.');
  alert('✅ 모든 사용자 데이터가 초기화되었습니다!\n⚠️ Google OAuth 인증 정보는 유지됩니다.');
}

// 전역 함수로 노출 (개발 및 프로덕션 모두)
if (typeof window !== 'undefined') {
  (window as any).clearAllAppData = clearAllAppData;
  (window as any).clearAppData = clearAllAppData; // 짧은 이름으로도 접근 가능
  console.log('💡 You can call window.clearAllAppData() or window.clearAppData() in the console to clear all data.');
}
