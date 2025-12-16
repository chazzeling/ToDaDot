import { contextBridge, ipcRenderer } from 'electron';

// Electron API를 렌더러 프로세스에 안전하게 노출
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 데이터베이스 관련 API ====================
  
  // 메모 저장
  dbSaveMemo: (todoId: string, content: string) => 
    ipcRenderer.invoke('db-save-memo', todoId, content),
  
  // 메모 불러오기
  dbGetMemo: (todoId: string) => 
    ipcRenderer.invoke('db-get-memo', todoId),
  
  // 메모 삭제
  dbDeleteMemo: (todoId: string) => 
    ipcRenderer.invoke('db-delete-memo', todoId),
  
  // 헤더 이미지 저장
  dbSaveHeaderImage: (imagePath: string) => 
    ipcRenderer.invoke('db-save-header-image', imagePath),
  
  // 헤더 이미지 불러오기
  dbGetHeaderImage: () => 
    ipcRenderer.invoke('db-get-header-image'),
  
  // 헤더 이미지 삭제
  dbDeleteHeaderImage: () => 
    ipcRenderer.invoke('db-delete-header-image'),
  
  // 스티커 저장
  dbSaveSticker: (
    date: string,
    imagePath: string,
    positionX: number,
    positionY: number,
    width: number,
    height: number,
    isLocked: boolean
  ) => 
    ipcRenderer.invoke('db-save-sticker', date, imagePath, positionX, positionY, width, height, isLocked),
  
  // 날짜별 스티커 불러오기
  dbGetStickers: (date: string) => 
    ipcRenderer.invoke('db-get-stickers', date),
  
  // 모든 스티커 불러오기
  dbGetAllStickers: () => 
    ipcRenderer.invoke('db-get-all-stickers'),
  
  // 스티커 업데이트
  dbUpdateSticker: (id: string, positionX?: number, positionY?: number, isLocked?: boolean) => 
    ipcRenderer.invoke('db-update-sticker', id, positionX, positionY, isLocked),
  
  // 스티커 삭제
  dbDeleteSticker: (id: string) => 
    ipcRenderer.invoke('db-delete-sticker', id),
  
  // 스티커 재로드 트리거
  reloadStickers: () => 
    ipcRenderer.invoke('reload-stickers'),
  
  // 스티커 이미지 파일로 저장 (Base64 → 파일)
  saveStickerImage: (base64Data: string) => 
    ipcRenderer.invoke('save-sticker-image', base64Data),
  
  // 스티커 이미지 파일 불러오기 (파일 → Base64)
  loadStickerImage: (imagePath: string) => 
    ipcRenderer.invoke('load-sticker-image', imagePath),

  // ==================== 스티커 레이아웃 관련 API ====================
  
  // 스티커 레이아웃 저장
  dbSaveStickerLayout: (
    id: string,
    name: string,
    resolutionWidth: number,
    resolutionHeight: number,
    stickersData: string,
    savedAt: number
  ) => 
    ipcRenderer.invoke('db-save-sticker-layout', id, name, resolutionWidth, resolutionHeight, stickersData, savedAt),
  
  // 모든 스티커 레이아웃 불러오기
  dbGetAllStickerLayouts: () => 
    ipcRenderer.invoke('db-get-all-sticker-layouts'),
  
  // 스티커 레이아웃 불러오기 (ID로)
  dbGetStickerLayout: (id: string) => 
    ipcRenderer.invoke('db-get-sticker-layout', id),
  
  // 스티커 레이아웃 삭제
  dbDeleteStickerLayout: (id: string) => 
    ipcRenderer.invoke('db-delete-sticker-layout', id),
  
  // 데이터베이스 전체 초기화
  dbClearAllData: () => 
    ipcRenderer.invoke('db-clear-all-data'),

  // ==================== Google API 관련 API ====================
  
  // Google 인증 정보 설정
  googleSetCredentials: (clientId: string, clientSecret: string) => 
    ipcRenderer.invoke('google-set-credentials', clientId, clientSecret),
  
  // 인증 URL 가져오기
  googleGetAuthUrl: () => 
    ipcRenderer.invoke('google-get-auth-url'),
  
  // 인증 코드로 토큰 교환
  googleExchangeCode: (code: string) => 
    ipcRenderer.invoke('google-exchange-code', code),
  
  // 인증 상태 확인
  googleIsAuthenticated: () => 
    ipcRenderer.invoke('google-is-authenticated'),
  
  // OAuth 초기화 상태 확인
  googleIsOAuthReady: () => 
    ipcRenderer.invoke('google-is-oauth-ready'),
  
  // 로그아웃
  googleLogout: () => 
    ipcRenderer.invoke('google-logout'),
  
  // Google Calendar 이벤트 가져오기
  googleGetEvents: (timeMin: string, timeMax: string) => 
    ipcRenderer.invoke('google-get-events', timeMin, timeMax),
  
  // Google Calendar 이벤트 생성
  googleCreateEvent: (eventData: any) => 
    ipcRenderer.invoke('google-create-event', eventData),
  
  // Google Calendar 이벤트 수정
  googleUpdateEvent: (eventId: string, eventData: any) => 
    ipcRenderer.invoke('google-update-event', eventId, eventData),
  
  // Google Calendar 이벤트 삭제
  googleDeleteEvent: (eventId: string) => 
    ipcRenderer.invoke('google-delete-event', eventId),
  
  // Google Tasks 가져오기
  googleGetTasks: (tasklistId?: string) => 
    ipcRenderer.invoke('google-get-tasks', tasklistId),
  
  // Google Tasks 생성
  googleCreateTask: (tasklistId: string, taskData: any) => 
    ipcRenderer.invoke('google-create-task', tasklistId, taskData),
  
  // Google Tasks 수정
  googleUpdateTask: (tasklistId: string, taskId: string, taskData: any) => 
    ipcRenderer.invoke('google-update-task', tasklistId, taskId, taskData),
  
  // Google Tasks 삭제
  googleDeleteTask: (tasklistId: string, taskId: string) => 
    ipcRenderer.invoke('google-delete-task', tasklistId, taskId),

  // ==================== Firebase 관련 API ====================
  
  // Firebase 설정 저장
  firebaseSetConfig: (config: any) => 
    ipcRenderer.invoke('firebase-set-config', config),
  
  // Firebase 설정 불러오기
  firebaseGetConfig: () => 
    ipcRenderer.invoke('firebase-get-config'),
  
  // Google OAuth 토큰 가져오기 (Firebase 인증용)
  firebaseGetGoogleTokens: () => 
    ipcRenderer.invoke('firebase-get-google-tokens'),
  
  // 초기 데이터 로드 (로그인 후)
  loadInitialData: (timeMin: string, timeMax: string) => 
    ipcRenderer.invoke('load-initial-data', timeMin, timeMax),
  
  // ==================== OAuth 리다이렉트 이벤트 ====================
  
  // OAuth 코드 수신 이벤트 리스너
  onOAuthCodeReceived: (callback: (code: string) => void) => {
    ipcRenderer.on('oauth-code-received', (event, data) => {
      callback(data.code);
    });
  },
  
  // OAuth 에러 수신 이벤트 리스너
  onOAuthError: (callback: (error: { error: string; errorDescription: string }) => void) => {
    ipcRenderer.on('oauth-error', (event, data) => {
      callback(data);
    });
  },
  
  // 이벤트 리스너 제거
  removeOAuthListeners: () => {
    ipcRenderer.removeAllListeners('oauth-code-received');
    ipcRenderer.removeAllListeners('oauth-error');
  },

  // ==================== PDF 내보내기 관련 API ====================
  
  // HTML 콘텐츠를 PDF로 변환
  printToPDF: async (htmlContent: string, options?: {
    pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
    landscape?: boolean;
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }) => {
    try {
      console.log('📤 IPC 호출 시작: print-to-pdf');
      console.log('   HTML 길이:', htmlContent.length);
      console.log('   옵션:', options);
      
      const result = await ipcRenderer.invoke('print-to-pdf', htmlContent, options);
      console.log('📥 IPC 응답 받음:', result);
      return result;
    } catch (error: any) {
      // IPC 에러를 상세히 로깅
      console.error('❌ IPC 에러 발생:');
      console.error('   에러 타입:', typeof error);
      console.error('   에러:', error);
      console.error('   에러 메시지:', error?.message);
      console.error('   에러 스택:', error?.stack);
      console.error('   에러 문자열:', error?.toString());
      console.error('   에러 JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // 에러 메시지 추출 시도
      let errorMessage = 'Unknown error';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString();
      } else {
        // 에러 객체의 모든 속성 확인
        try {
          const errorKeys = Object.keys(error || {});
          if (errorKeys.length > 0) {
            errorMessage = `Error with keys: ${errorKeys.join(', ')}`;
          }
        } catch (e) {
          errorMessage = 'Failed to extract error message';
        }
      }
      
      return {
        success: false,
        error: `IPC Error: ${errorMessage}`
      };
    }
  },
});