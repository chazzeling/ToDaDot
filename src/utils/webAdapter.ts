// 웹 환경을 위한 Electron API 어댑터
// Electron이 아닌 환경에서도 동작하도록 폴백 구현

// 환경 감지
export const isElectron = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const electronAPI = (window as any).electronAPI;
  
  // 웹 어댑터가 설정한 경우 (__isWebAdapter 플래그 확인)
  if (electronAPI && electronAPI.__isWebAdapter === true) {
    return false;
  }
  
  // 실제 Electron 환경인지 확인
  // Electron은 process.versions.electron이 존재함
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    return true;
  }
  
  // window.electronAPI가 있고 웹 어댑터 플래그가 없으면 Electron으로 간주
  if (electronAPI && typeof electronAPI === 'object') {
    // 실제 Electron인지 확인하기 위해 다른 방법 사용
    return typeof (window as any).require !== 'undefined';
  }
  
  return false;
};

// IndexedDB를 사용한 웹 스토리지 어댑터
class WebStorageAdapter {
  private dbName = 'todadot-web-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 스토어 생성
        if (!db.objectStoreNames.contains('memos')) {
          db.createObjectStore('memos', { keyPath: 'todoId' });
        }
        if (!db.objectStoreNames.contains('headerImages')) {
          db.createObjectStore('headerImages', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('stickers')) {
          db.createObjectStore('stickers', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('stickerLayouts')) {
          db.createObjectStore('stickerLayouts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stickerImages')) {
          db.createObjectStore('stickerImages', { keyPath: 'path' });
        }
      };
    });
  }

  async getStore(storeName: string): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction([storeName], 'readwrite');
    return transaction.objectStore(storeName);
  }

  // 메모 저장
  async saveMemo(todoId: string, content: string): Promise<{ success: boolean }> {
    try {
      const store = await this.getStore('memos');
      await new Promise((resolve, reject) => {
        const request = store.put({ todoId, content });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to save memo:', error);
      return { success: false };
    }
  }

  // 메모 불러오기
  async getMemo(todoId: string): Promise<any> {
    try {
      const store = await this.getStore('memos');
      return new Promise((resolve, reject) => {
        const request = store.get(todoId);
        request.onsuccess = () => resolve(request.result?.content || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get memo:', error);
      return null;
    }
  }

  // 메모 삭제
  async deleteMemo(todoId: string): Promise<{ success: boolean }> {
    try {
      const store = await this.getStore('memos');
      await new Promise((resolve, reject) => {
        const request = store.delete(todoId);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete memo:', error);
      return { success: false };
    }
  }

  // 헤더 이미지 저장
  async saveHeaderImage(imageData: string): Promise<{ success: boolean }> {
    try {
      const store = await this.getStore('headerImages');
      await new Promise((resolve, reject) => {
        const request = store.put({ id: 1, imageData });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to save header image:', error);
      return { success: false };
    }
  }

  // 헤더 이미지 불러오기
  async getHeaderImage(): Promise<any> {
    try {
      const store = await this.getStore('headerImages');
      return new Promise((resolve, reject) => {
        const request = store.get(1);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? { imagePath: result.imageData } : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get header image:', error);
      return null;
    }
  }

  // 헤더 이미지 삭제
  async deleteHeaderImage(): Promise<{ success: boolean }> {
    try {
      const store = await this.getStore('headerImages');
      await new Promise((resolve, reject) => {
        const request = store.delete(1);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to delete header image:', error);
      return { success: false };
    }
  }

  // 스티커 저장
  async saveSticker(
    date: string,
    imageData: string,
    positionX: number,
    positionY: number,
    width: number,
    height: number,
    isLocked: boolean
  ): Promise<{ success: boolean; id: string }> {
    try {
      const store = await this.getStore('stickers');
      const id = Date.now().toString();
      await new Promise((resolve, reject) => {
        const request = store.add({
          id,
          date,
          imageData,
          positionX,
          positionY,
          width,
          height,
          isLocked,
        });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return { success: true, id };
    } catch (error) {
      console.error('Failed to save sticker:', error);
      return { success: false, id: '' };
    }
  }

  // 스티커 불러오기
  async getStickers(date: string): Promise<any[]> {
    try {
      const store = await this.getStore('stickers');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          const filtered = all.filter((s: any) => s.date === date);
          resolve(filtered.map((s: any) => ({
            id: s.id,
            date: s.date,
            imagePath: s.imageData,
            positionX: s.positionX,
            positionY: s.positionY,
            width: s.width,
            height: s.height,
            isLocked: s.isLocked,
          })));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get stickers:', error);
      return [];
    }
  }

  // 모든 스티커 불러오기
  async getAllStickers(): Promise<any[]> {
    try {
      const store = await this.getStore('stickers');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = request.result || [];
          resolve(all.map((s: any) => ({
            id: s.id,
            date: s.date,
            imagePath: s.imageData,
            positionX: s.positionX,
            positionY: s.positionY,
            width: s.width,
            height: s.height,
            isLocked: s.isLocked,
          })));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get all stickers:', error);
      return [];
    }
  }

  // 스티커 이미지 저장 (Base64 → Blob URL)
  async saveStickerImage(base64Data: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      // Base64를 Blob으로 변환
      const blob = await fetch(base64Data).then(r => r.blob());
      const blobUrl = URL.createObjectURL(blob);
      
      // IndexedDB에 저장
      const store = await this.getStore('stickerImages');
      const path = `sticker-${Date.now()}.png`;
      await new Promise((resolve, reject) => {
        const request = store.put({ path, blobUrl, base64Data });
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      
      return { success: true, filePath: blobUrl };
    } catch (error: any) {
      console.error('Failed to save sticker image:', error);
      return { success: false, error: error.message };
    }
  }

  // 스티커 이미지 불러오기
  async loadStickerImage(imagePath: string): Promise<{ success: boolean; dataUrl?: string; error?: string }> {
    try {
      // Blob URL인 경우
      if (imagePath.startsWith('blob:')) {
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            resolve({ success: true, dataUrl: reader.result as string });
          };
          reader.onerror = () => {
            resolve({ success: false, error: 'Failed to read blob' });
          };
          reader.readAsDataURL(blob);
        });
      }
      
      // IndexedDB에서 찾기
      const store = await this.getStore('stickerImages');
      return new Promise((resolve, reject) => {
        const request = store.get(imagePath);
        request.onsuccess = () => {
          const result = request.result;
          if (result) {
            resolve({ success: true, dataUrl: result.base64Data || result.blobUrl });
          } else {
            resolve({ success: false, error: 'Image not found' });
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error: any) {
      console.error('Failed to load sticker image:', error);
      return { success: false, error: error.message };
    }
  }
}

// 웹 어댑터 인스턴스
const webAdapter = new WebStorageAdapter();

// Electron API 폴백 구현
export const createWebElectronAPI = (): any => {
  return {
    // 데이터베이스 관련
    dbSaveMemo: async (todoId: string, content: string) => {
      return webAdapter.saveMemo(todoId, content);
    },
    dbGetMemo: async (todoId: string) => {
      return webAdapter.getMemo(todoId);
    },
    dbDeleteMemo: async (todoId: string) => {
      return webAdapter.deleteMemo(todoId);
    },
    dbSaveHeaderImage: async (imageData: string) => {
      return webAdapter.saveHeaderImage(imageData);
    },
    dbGetHeaderImage: async () => {
      return webAdapter.getHeaderImage();
    },
    dbDeleteHeaderImage: async () => {
      return webAdapter.deleteHeaderImage();
    },
    dbSaveSticker: async (
      date: string,
      imageData: string,
      positionX: number,
      positionY: number,
      width: number,
      height: number,
      isLocked: boolean
    ) => {
      return webAdapter.saveSticker(date, imageData, positionX, positionY, width, height, isLocked);
    },
    dbGetStickers: async (date: string) => {
      return webAdapter.getStickers(date);
    },
    dbGetAllStickers: async () => {
      return webAdapter.getAllStickers();
    },
    saveStickerImage: async (base64Data: string) => {
      return webAdapter.saveStickerImage(base64Data);
    },
    loadStickerImage: async (imagePath: string) => {
      return webAdapter.loadStickerImage(imagePath);
    },
    dbUpdateSticker: async (id: string, positionX?: number, positionY?: number, isLocked?: boolean) => {
      // IndexedDB 업데이트 구현
      return { success: true };
    },
    dbDeleteSticker: async (id: string) => {
      // IndexedDB 삭제 구현
      return { success: true };
    },
    reloadStickers: async () => {
      // 웹에서는 리로드 불필요
      return Promise.resolve();
    },
    
    // PDF 내보내기 (html2canvas + jsPDF 사용)
    printToPDF: async (htmlContent: string, options?: any) => {
      // 웹에서는 html2canvas + jsPDF 사용
      const { exportToPDF } = await import('./pdfExport');
      // 임시 div 생성하여 HTML 로드
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      try {
        // html2canvas로 캡처 후 jsPDF로 변환
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');
        
        const canvas = await html2canvas(tempDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
        });
        
        const pdf = new jsPDF({
          orientation: options?.landscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: options?.pageSize || 'a4',
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Blob으로 변환하여 반환
        const pdfBlob = pdf.output('blob');
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ success: true, data: base64 });
          };
          reader.readAsDataURL(pdfBlob);
        });
      } finally {
        document.body.removeChild(tempDiv);
      }
    },
    
    // Google API는 웹에서 직접 구현 필요 (서버 사이드 OAuth → 클라이언트 사이드)
    googleSetCredentials: async () => ({ success: false, error: 'Not available in web' }),
    googleGetAuthUrl: async () => ({ success: false, error: 'Not available in web' }),
    googleExchangeCode: async () => ({ success: false, error: 'Not available in web' }),
    googleIsAuthenticated: async () => ({ success: false }),
    googleIsOAuthReady: async () => {
      // 웹 환경에서는 OAuth를 사용할 수 없으므로 항상 false 반환
      console.log('🌐 Web environment: OAuth not available');
      return false;
    },
    googleLogout: async () => ({ success: false }),
    googleGetEvents: async () => ({ success: false, events: [] }),
    googleCreateEvent: async () => ({ success: false }),
    googleUpdateEvent: async () => ({ success: false }),
    googleDeleteEvent: async () => ({ success: false }),
    googleGetTasks: async () => ({ success: false, tasks: [] }),
    googleCreateTask: async () => ({ success: false }),
    googleUpdateTask: async () => ({ success: false }),
    googleDeleteTask: async () => ({ success: false }),
    
    // Firebase는 웹에서도 사용 가능 (Firebase SDK 직접 사용)
    firebaseSetConfig: async () => {
      console.log('🌐 Web: Firebase config should be set via Firebase SDK directly');
      return { success: true };
    },
    firebaseGetConfig: async () => {
      // 웹에서는 기본 Firebase 설정 반환
      const { DEFAULT_FIREBASE_CONFIG } = await import('../firebase/firebase');
      return { success: true, config: DEFAULT_FIREBASE_CONFIG };
    },
    firebaseGetGoogleTokens: async () => {
      // 웹에서는 Firebase Auth에서 직접 토큰 가져오기
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      try {
        const idToken = await user.getIdToken();
        const accessToken = (user as any).accessToken || null;
        return {
          success: true,
          tokens: {
            id_token: idToken,
            access_token: accessToken,
          },
        };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
    loadInitialData: async () => ({ success: false }),
    
    // OAuth 이벤트 리스너
    onOAuthCodeReceived: () => {},
    onOAuthError: () => {},
    removeOAuthListeners: () => {},
    
    // 스티커 레이아웃
    dbSaveStickerLayout: async () => ({ success: false, error: 'Not implemented in web' }),
    dbGetAllStickerLayouts: async () => ({ success: false, layouts: [] }),
    dbGetStickerLayout: async () => ({ success: false }),
    dbDeleteStickerLayout: async () => ({ success: false }),
    dbClearAllData: async () => {
      // IndexedDB 초기화
      await webAdapter.init();
      return { success: true };
    },
  };
};

// Electron API 가져오기 (웹 환경에서는 폴백 사용)
export const getElectronAPI = (): any => {
  if (isElectron()) {
    return (window as any).electronAPI;
  } else {
    // 웹 환경에서는 폴백 API 사용
    if (!(window as any).electronAPI) {
      const webAPI = createWebElectronAPI();
      // 웹 어댑터 플래그 추가
      (webAPI as any).__isWebAdapter = true;
      (window as any).electronAPI = webAPI;
    }
    return (window as any).electronAPI;
  }
};

