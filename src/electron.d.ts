// Electron API 타입 정의
export interface ElectronAPI {
  // 데이터베이스 관련
  dbSaveMemo: (todoId: string, content: string) => Promise<{ success: boolean }>;
  dbGetMemo: (todoId: string) => Promise<any>;
  dbDeleteMemo: (todoId: string) => Promise<{ success: boolean }>;
  dbSaveHeaderImage: (imagePath: string) => Promise<{ success: boolean }>;
  dbGetHeaderImage: () => Promise<any>;
  dbDeleteHeaderImage: () => Promise<{ success: boolean }>;
  dbSaveSticker: (
    date: string,
    imagePath: string,
    positionX: number,
    positionY: number,
    width: number,
    height: number,
    isLocked: boolean
  ) => Promise<{ success: boolean; id: string }>;
  dbGetStickers: (date: string) => Promise<any[]>;
  dbGetAllStickers: () => Promise<any[]>;
  reloadStickers: () => Promise<void>;
  saveStickerImage: (base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  loadStickerImage: (imagePath: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
  dbUpdateSticker: (id: string, positionX?: number, positionY?: number, isLocked?: boolean) => Promise<{ success: boolean }>;
  dbDeleteSticker: (id: string) => Promise<{ success: boolean }>;
  dbSaveStickerLayout: (
    id: string,
    name: string,
    resolutionWidth: number,
    resolutionHeight: number,
    stickersData: string,
    savedAt: number
  ) => Promise<{ success: boolean; error?: string }>;
  dbGetAllStickerLayouts: () => Promise<{ success: boolean; layouts?: any[]; error?: string }>;
  dbGetStickerLayout: (id: string) => Promise<{ success: boolean; layout?: any; error?: string }>;
  dbDeleteStickerLayout: (id: string) => Promise<{ success: boolean; error?: string }>;
  dbClearAllData: () => Promise<{ success: boolean; error?: string }>;

  // Google API 관련
  googleSetCredentials: (clientId: string, clientSecret: string) => Promise<{ success: boolean; error?: string }>;
  googleGetAuthUrl: () => Promise<{ success: boolean; url?: string; error?: string }>;
  googleExchangeCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  googleIsAuthenticated: () => Promise<boolean>;
  googleIsOAuthReady: () => Promise<boolean>;
  googleLogout: () => Promise<{ success: boolean }>;
  googleGetEvents: (timeMin: string, timeMax: string) => Promise<{ success: boolean; events?: any[]; error?: string }>;
  googleCreateEvent: (eventData: any) => Promise<{ success: boolean; event?: any; error?: string }>;
  googleUpdateEvent: (eventId: string, eventData: any) => Promise<{ success: boolean; event?: any; error?: string }>;
  googleDeleteEvent: (eventId: string) => Promise<{ success: boolean; error?: string }>;
  googleGetTasks: (tasklistId?: string) => Promise<{ success: boolean; tasks?: any[]; error?: string }>;
  googleCreateTask: (tasklistId: string, taskData: any) => Promise<{ success: boolean; task?: any; error?: string }>;
  googleUpdateTask: (tasklistId: string, taskId: string, taskData: any) => Promise<{ success: boolean; task?: any; error?: string }>;
  googleDeleteTask: (tasklistId: string, taskId: string) => Promise<{ success: boolean; error?: string }>;

  // Firebase 관련
  firebaseSetConfig: (config: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  }) => Promise<{ success: boolean; error?: string }>;
  firebaseGetConfig: () => Promise<{ success: boolean; config?: any; error?: string }>;
  firebaseGetGoogleTokens: () => Promise<{ success: boolean; tokens?: any; error?: string }>;
  loadInitialData: (timeMin: string, timeMax: string) => Promise<{
    success: boolean;
    calendar?: { success: boolean; events?: any[] };
    tasks?: { success: boolean; tasks?: any[] };
    error?: string;
  }>;

  // PDF 내보내기 관련
  printToPDF: (
    htmlContent: string,
    options?: {
      pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
      landscape?: boolean;
      margins?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
      };
    }
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}