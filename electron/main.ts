// 에러 핸들링: 모든 unhandled 에러를 캐치
process.on('uncaughtException', (error) => {
  console.error('❌❌❌ UNCAUGHT EXCEPTION ❌❌❌');
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  console.error('Error name:', error.name);
  if (error.cause) {
    console.error('Error cause:', error.cause);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ UNHANDLED REJECTION ❌❌❌');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
});

const { app, BrowserWindow, ipcMain, Menu, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const url = require('node:url');
const dotenv = require('dotenv');

// 앱 이름 설정 (Windows 작업 표시줄에서 표시되는 이름)
// app.whenReady() 전에 호출해야 함
app.setName('ToDaDot');

// Windows에서 작업 표시줄 아이콘과 이름을 올바르게 표시하기 위한 설정
if (process.platform === 'win32') {
  // App User Model ID 설정 (Windows 작업 표시줄에서 앱을 식별하는 고유 ID)
  // package.json의 appId와 일치시켜야 함
  app.setAppUserModelId('com.todadot.app');
}

// 모듈 import - Vite가 번들링 시점에 처리
// 프로덕션 모드에서는 Vite가 이 import들을 번들링하여 main.cjs에 포함시킴
import * as dbModule from './database';
import * as googleModule from './googleApi';
import * as firebaseModule from './firebaseConfig';

// .env 파일 로드
const envPath = path.resolve(process.cwd(), '.env');
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error('⚠️ [main.ts] Failed to load .env file:', dotenvResult.error.message);
  console.error('   Error code:', dotenvResult.error.code);
}

// GOOGLE_CLIENT_SECRET 확인
if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ [main.ts] GOOGLE_CLIENT_SECRET is NOT set');
}

// CommonJS __dirname 정의
// Electron에서 require.main.filename은 dist-electron/main.cjs 파일 경로를 가리킴
let __dirname: string;
if (require.main?.filename) {
  __dirname = path.resolve(path.dirname(require.main.filename));
} else {
  // fallback: 현재 작업 디렉토리 기준
  __dirname = path.resolve(process.cwd(), 'dist-electron');
}

// 모듈 로드 - Vite가 번들링하므로 직접 import 사용
// 개발 모드에서는 tsx를 사용하여 동적 로드, 프로덕션에서는 Vite가 번들링
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let initDatabase: any, getDatabase: any, closeDatabase: any, dbSaveStickerLayout: any, dbGetAllStickerLayouts: any, dbGetStickerLayout: any, dbDeleteStickerLayout: any, clearAllDatabaseData: any;
let setGoogleCredentials: any, initializeGoogleOAuth: any, isOAuthInitialized: any, loadGoogleCredentials: any, getAuthUrl: any, exchangeCodeForToken: any, loadToken: any, getCalendarApi: any, getTasksApi: any, isAuthenticated: any, logout: any, getTokens: any;
let loadFirebaseConfig: any, saveFirebaseConfig: any, FirebaseConfig: any;

try {
  console.log('📦 Loading modules...');
  console.log('   isDev:', isDev);
  console.log('   __dirname:', __dirname);
  
  if (isDev) {
    // 개발 모드: tsx를 사용하여 TypeScript 파일을 동적으로 로드
    try {
      const tsxApi = require('tsx/cjs/api');
      console.log('   📦 tsx API loaded');
      const tsConfigPath = path.resolve(__dirname, '..', 'tsconfig.json');
      console.log('   📦 Registering tsx with config:', tsConfigPath);
      tsxApi.register({
        tsconfig: tsConfigPath,
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2020',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      });
      console.log('   ✅ tsx registered');
      
      // TypeScript 파일 직접 require
      const dbModule = require(path.resolve(__dirname, '..', 'electron', 'database.ts'));
      const googleModule = require(path.resolve(__dirname, '..', 'electron', 'googleApi.ts'));
      const firebaseModule = require(path.resolve(__dirname, '..', 'electron', 'firebaseConfig.ts'));
      
      initDatabase = dbModule.initDatabase;
      getDatabase = dbModule.getDatabase;
      closeDatabase = dbModule.closeDatabase;
      dbSaveStickerLayout = dbModule.dbSaveStickerLayout;
      dbGetAllStickerLayouts = dbModule.dbGetAllStickerLayouts;
      dbGetStickerLayout = dbModule.dbGetStickerLayout;
      dbDeleteStickerLayout = dbModule.dbDeleteStickerLayout;
      clearAllDatabaseData = dbModule.clearAllDatabaseData;
      
      setGoogleCredentials = googleModule.setGoogleCredentials;
      initializeGoogleOAuth = googleModule.initializeGoogleOAuth;
      isOAuthInitialized = googleModule.isOAuthInitialized;
      loadGoogleCredentials = googleModule.loadGoogleCredentials;
      getAuthUrl = googleModule.getAuthUrl;
      exchangeCodeForToken = googleModule.exchangeCodeForToken;
      loadToken = googleModule.loadToken;
      getCalendarApi = googleModule.getCalendarApi;
      getTasksApi = googleModule.getTasksApi;
      isAuthenticated = googleModule.isAuthenticated;
      logout = googleModule.logout;
      getTokens = googleModule.getTokens;
      
      loadFirebaseConfig = firebaseModule.loadFirebaseConfig;
      saveFirebaseConfig = firebaseModule.saveFirebaseConfig;
      FirebaseConfig = firebaseModule.FirebaseConfig;
    } catch (tsxError: any) {
      console.error('   ❌ tsx error:', tsxError?.message);
      console.error('   Error stack:', tsxError?.stack);
      throw tsxError;
    }
  } else {
    // 프로덕션 모드: 파일 상단에서 import한 모듈 사용
    // Vite가 빌드 시점에 이 모듈들을 번들링하여 main.cjs에 포함시킴
    initDatabase = dbModule.initDatabase;
    getDatabase = dbModule.getDatabase;
    closeDatabase = dbModule.closeDatabase;
    dbSaveStickerLayout = dbModule.dbSaveStickerLayout;
    dbGetAllStickerLayouts = dbModule.dbGetAllStickerLayouts;
    dbGetStickerLayout = dbModule.dbGetStickerLayout;
    dbDeleteStickerLayout = dbModule.dbDeleteStickerLayout;
    clearAllDatabaseData = dbModule.clearAllDatabaseData;
    
    setGoogleCredentials = googleModule.setGoogleCredentials;
    initializeGoogleOAuth = googleModule.initializeGoogleOAuth;
    isOAuthInitialized = googleModule.isOAuthInitialized;
    loadGoogleCredentials = googleModule.loadGoogleCredentials;
    getAuthUrl = googleModule.getAuthUrl;
    exchangeCodeForToken = googleModule.exchangeCodeForToken;
    loadToken = googleModule.loadToken;
    getCalendarApi = googleModule.getCalendarApi;
    getTasksApi = googleModule.getTasksApi;
    isAuthenticated = googleModule.isAuthenticated;
    logout = googleModule.logout;
    getTokens = googleModule.getTokens;
    
    loadFirebaseConfig = firebaseModule.loadFirebaseConfig;
    saveFirebaseConfig = firebaseModule.saveFirebaseConfig;
    FirebaseConfig = firebaseModule.FirebaseConfig;
    
    console.log('✅ All modules loaded successfully (production mode - bundled)');
  }
} catch (importError: any) {
  console.error('❌❌❌ FATAL ERROR: Module Import Failed ❌❌❌');
  console.error('Error name:', importError?.name);
  console.error('Error message:', importError?.message);
  console.error('Error stack:', importError?.stack);
  if (importError?.cause) {
    console.error('Error cause:', importError.cause);
  }
  console.error('Fatal Error during API initialization:', importError);
  throw importError;
}
console.log('✅ [main.ts] File paths initialized');
console.log('   __dirname:', __dirname);

// 앱 이름 설정 (Windows 작업 표시줄에서 표시되는 이름)
app.setName('ToDaDot');

// 개발 모드에서 Vite 서버 URL, 프로덕션에서는 빌드된 파일 경로
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // 최소 너비 계산은 그대로 둬도 돼 (860px)
  const minWidth = 860;
  
  // 헤더 높이 75px 기준으로 최소 높이 계산
  // 헤더(75px) + 최소 콘텐츠 영역(약 600px) = 675px
  const minHeight = 675;
  
  // 🚨 아이콘 경로 설정 (프로젝트 루트의 icon.png 사용)
  // Windows에서는 .ico 파일이 권장되지만, .png도 작동함
  // 빌드 시 electron-builder가 자동으로 .ico로 변환
  let iconPath: string | undefined;
  
  if (process.platform === 'win32') {
    // Windows: .ico 파일 우선, 없으면 .png 사용
    const icoPath = path.join(__dirname, '..', 'icon.ico');
    const pngPath = path.join(__dirname, '..', 'icon.png');
    iconPath = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(pngPath) ? pngPath : undefined);
  } else {
    // macOS/Linux: .png 사용
    const pngPath = path.join(__dirname, '..', 'icon.png');
    iconPath = fs.existsSync(pngPath) ? pngPath : undefined;
  }
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: minWidth,
    minHeight: minHeight,
    icon: iconPath,
    title: 'ToDaDot', // 창 제목 설정
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // Content Security Policy 설정
      // Firebase Authentication이 file:// 프로토콜에서 작동하도록 webSecurity 비활성화
      // Electron 앱 내부에서만 사용되므로 보안상 문제 없음
      webSecurity: false,
      // Firebase Authentication 팝업을 위해 필요
      nativeWindowOpen: true,
    },
  });
  
  // Windows에서 작업 표시줄 아이콘 강제 설정
  if (process.platform === 'win32' && iconPath) {
    mainWindow.setIcon(iconPath);
  }
  
  // Firebase Authentication 팝업 처리
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Firebase Authentication 팝업을 새 창으로 열기
    if (url.includes('accounts.google.com') || url.includes('firebaseapp.com') || url.includes('google.com')) {
      console.log('🔒 Opening Firebase Authentication popup:', url);
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 500,
          height: 600,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            // Firebase Authentication 팝업도 webSecurity 비활성화
            webSecurity: false,
            sandbox: false,
          },
        },
      };
    }
    // 다른 팝업은 기본 브라우저에서 열기
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  
  // 팝업 창이 생성된 후 CSP 설정
  mainWindow.webContents.on('did-create-window', (popupWindow: BrowserWindow) => {
    console.log('🔒 Popup window created, setting up CSP...');
    
    // 팝업 창의 URL 확인
    popupWindow.webContents.on('did-navigate', (event: any, url: string) => {
      console.log('🔒 Popup navigated to:', url);
    });
    
    // 팝업 창에도 CSP 및 COOP 설정
    popupWindow.webContents.session.webRequest.onHeadersReceived((details: any, callback: any) => {
      const responseHeaders = {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googleapis.com https://*.google.com; " +
          "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.google.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com; " +
          "frame-src 'self' https://*.google.com https://*.googleapis.com https://*.firebaseapp.com;"
        ]
      };
      
      // Cross-Origin-Opener-Policy 설정 (Firebase 팝업 인증을 위해 필요)
      // 'unsafe-none'으로 설정하여 window.closed 호출을 허용
      if (!responseHeaders['Cross-Origin-Opener-Policy']) {
        responseHeaders['Cross-Origin-Opener-Policy'] = ['unsafe-none'];
      }
      
      // Cross-Origin-Embedder-Policy도 함께 설정 (선택사항)
      if (!responseHeaders['Cross-Origin-Embedder-Policy']) {
        responseHeaders['Cross-Origin-Embedder-Policy'] = ['unsafe-none'];
      }
      
      callback({ responseHeaders });
    });
    
    // 팝업 창 로딩 상태 모니터링
    popupWindow.webContents.on('did-start-loading', () => {
      console.log('🔒 Popup window started loading...');
    });
    
    popupWindow.webContents.on('did-finish-load', () => {
      console.log('🔒 Popup window finished loading');
      const url = popupWindow.webContents.getURL();
      console.log('🔒 Popup URL:', url);
    });
    
    popupWindow.webContents.on('did-fail-load', (event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
      console.error('❌ Popup window failed to load:', {
        errorCode,
        errorDescription,
        url: validatedURL
      });
    });
    
    // 팝업 창의 콘솔 메시지 확인
    popupWindow.webContents.on('console-message', (event: any, level: number, message: string) => {
      console.log(`🔒 Popup console [${level}]:`, message);
    });
    
    // 팝업 창이 닫힐 때 메인 창에 알림
    popupWindow.on('closed', () => {
      console.log('🔒 Popup window closed');
    });
    
    // 개발 모드에서 팝업 창의 개발자 도구 열기 (디버깅용)
    if (isDev) {
      popupWindow.webContents.openDevTools();
    }
  });
  
  // Content Security Policy 및 COOP 헤더 설정
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "img-src 'self' data: blob: file:; " +
        "font-src 'self' data:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googleapis.com https://*.google.com; " +
        "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://*.googleapis.com https://*.google.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.firebase.com wss://*.firebaseio.com; " +
        "frame-src 'self' https://*.google.com https://*.googleapis.com https://*.firebaseapp.com;"
      ]
    };
    
    // Cross-Origin-Opener-Policy 설정 (Firebase 팝업 인증을 위해 필요)
    if (!responseHeaders['Cross-Origin-Opener-Policy']) {
      responseHeaders['Cross-Origin-Opener-Policy'] = ['unsafe-none'];
    }
    
    callback({ responseHeaders });
  });
  
  // --debug 플래그 확인 (프로덕션 모드에서도 개발자 도구 열기)
  const isDebugMode = process.argv.includes('--debug') || process.argv.includes('--inspect');
  
  // 페이지 로드 실패 이벤트 리스너 추가
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error('❌❌❌ PAGE LOAD FAILED ❌❌❌');
      console.error('   Error code:', errorCode);
      console.error('   Error description:', errorDescription);
      console.error('   URL:', validatedURL);
      console.error('   Is main frame:', isMainFrame);
      
      // 개발자 도구 열기 (에러 확인용)
      if (!mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow?.webContents.openDevTools();
      }
      
      // 에러 페이지 표시
      mainWindow?.webContents.executeJavaScript(`
        document.body.innerHTML = \`
          <div style="padding: 40px; font-family: Arial, sans-serif; text-align: center;">
            <h1 style="color: #e74c3c;">❌ 페이지 로드 실패</h1>
            <p><strong>에러 코드:</strong> ${errorCode}</p>
            <p><strong>에러 설명:</strong> ${errorDescription}</p>
            <p><strong>URL:</strong> ${validatedURL}</p>
            <p style="margin-top: 30px; color: #7f8c8d;">개발자 도구를 확인하여 자세한 에러를 확인하세요.</p>
          </div>
        \`;
      `).catch(() => {});
    }
  });
  
  // DOM 준비 완료 이벤트
  mainWindow.webContents.on('dom-ready', () => {
    console.log('✅ DOM ready');
  });
  
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // 프로덕션 모드: Firebase 인증을 위해 로컬 HTTP 서버 사용
    // file:// 프로토콜은 Firebase에서 지원하지 않으므로 http://localhost를 사용
    startStaticFileServer().then(() => {
      const localUrl = `http://localhost:${STATIC_FILE_PORT}`;
      console.log('🌐 Loading app from local HTTP server:', localUrl);
      mainWindow.loadURL(localUrl);
    }).catch((error: any) => {
      console.error('❌ Failed to start static file server:', error);
      // 폴백: file:// 프로토콜 사용 (Firebase 인증은 작동하지 않음)
      const htmlPath = path.join(app.getAppPath(), 'dist', 'index.html');
      console.log('📄 Falling back to file:// protocol:', htmlPath);
      mainWindow.loadFile(htmlPath).catch((loadError: any) => {
        console.error('❌ Failed to load HTML file:', loadError.message);
        const altPath = path.join(__dirname, '..', 'dist', 'index.html');
        mainWindow.loadFile(altPath).catch((altError: any) => {
          console.error('❌ Alternative path also failed:', altError.message);
          if (!mainWindow?.webContents.isDevToolsOpened()) {
            mainWindow?.webContents.openDevTools();
          }
        });
      });
    });
    
    // --debug 플래그가 있으면 개발자 도구 자동 열기
    if (isDebugMode) {
      console.log('🔧 Debug mode detected, opening DevTools...');
      mainWindow.webContents.openDevTools();
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// OAuth 콜백을 처리하기 위한 로컬 HTTP 서버
const OAUTH_REDIRECT_PORT = 8888;

// 정적 파일 서빙을 위한 로컬 HTTP 서버 (Firebase 인증을 위해 필요)
let staticFileServer: any = null;
const STATIC_FILE_PORT = 5174; // Vite 개발 서버(5173)와 다른 포트 사용
let oauthServer: any = null;

// OAuth 리다이렉트 URI 처리 함수
function handleOAuthCallback(queryParams: any) {
  try {
    const code = queryParams.code as string | null;
    const error = queryParams.error as string | null;
    
    if (error) {
      console.error('❌ OAuth error:', error);
      const errorDescription = (queryParams.error_description as string | undefined) || error;
      // IPC로 에러 전송
      if (mainWindow) {
        mainWindow.webContents.send('oauth-error', { error, errorDescription });
      }
      return;
    }
    
    if (code) {
      // IPC로 인증 코드 전송
      if (mainWindow) {
        mainWindow.webContents.send('oauth-code-received', { code });
      } else {
        // 윈도우가 없으면 나중에 사용할 수 있도록 저장
        (global as any).pendingOAuthCode = code;
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to process OAuth callback:', error);
    if (mainWindow) {
      mainWindow.webContents.send('oauth-error', { 
        error: 'parse_error', 
        errorDescription: error.message 
      });
    }
  }
}

// 정적 파일 서빙을 위한 로컬 HTTP 서버 시작
function startStaticFileServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (staticFileServer) {
      console.log('✅ Static file server is already running');
      resolve();
      return;
    }

    try {
      const distPath = path.join(app.getAppPath(), 'dist');
      console.log('📂 Serving static files from:', distPath);

      staticFileServer = http.createServer((req: any, res: any) => {
        const parsedUrl = url.parse(req.url || '/');
        let pathname = parsedUrl.pathname || '/';

        // 루트 경로는 index.html로
        if (pathname === '/') {
          pathname = '/index.html';
        }

        // app.asar 내부 파일 경로 처리
        let filePath: string;
        if (app.isPackaged) {
          // 패키징된 앱: app.asar 내부 파일
          filePath = path.join(app.getAppPath(), 'dist', pathname);
        } else {
          // 개발 모드: 일반 파일 시스템
          filePath = path.join(distPath, pathname);
        }

        // 보안: 상위 디렉토리 접근 방지
        const resolvedPath = path.resolve(filePath);
        const distResolved = path.resolve(distPath);
        if (!resolvedPath.startsWith(distResolved)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        // 파일 읽기 (app.asar 내부 파일 지원)
        const readFileFromAsar = (filePath: string, callback: (err: any, data: Buffer) => void) => {
          if (app.isPackaged && filePath.includes('.asar')) {
            // app.asar 내부 파일: asar 모듈 사용
            try {
              const asar = require('asar');
              const asarPath = filePath.split('.asar')[0] + '.asar';
              const filePathInAsar = filePath.split('.asar')[1].replace(/^[\\/]/, '');
              
              try {
                const data = asar.extractFile(asarPath, filePathInAsar);
                callback(null, Buffer.from(data));
              } catch (err: any) {
                callback(err, Buffer.alloc(0));
              }
            } catch (asarErr: any) {
              // asar 모듈이 없으면 일반 fs.readFile 사용 (실패할 수 있음)
              fs.readFile(filePath, callback);
            }
          } else {
            // 일반 파일: fs.readFile 사용
            fs.readFile(filePath, callback);
          }
        };

        readFileFromAsar(filePath, (err: any, data: Buffer) => {
          if (err) {
            if (err.code === 'ENOENT' || err.message) {
              // 파일이 없으면 index.html로 폴백 (SPA 라우팅)
              const indexPath = path.join(distPath, 'index.html');
              readFileFromAsar(indexPath, (indexErr: any, indexData: Buffer) => {
                if (indexErr) {
                  res.writeHead(404, { 'Content-Type': 'text/plain' });
                  res.end('404 Not Found');
                } else {
                  res.writeHead(200, { 'Content-Type': 'text/html' });
                  res.end(indexData);
                }
              });
            } else {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('500 Internal Server Error');
            }
            return;
          }

          // MIME 타입 설정
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';

          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });

      staticFileServer.listen(STATIC_FILE_PORT, 'localhost', () => {
        console.log(`✅ Static file server started on http://localhost:${STATIC_FILE_PORT}`);
        resolve();
      });

      staticFileServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${STATIC_FILE_PORT} is already in use, trying to use existing server`);
          // 포트가 이미 사용 중이면 기존 서버를 사용
          resolve();
        } else {
          console.error('❌ Static file server error:', err);
          reject(err);
        }
      });
    } catch (error: any) {
      console.error('❌ Failed to start static file server:', error);
      reject(error);
    }
  });
}

// 로컬 HTTP 서버 시작
function startOAuthServer() {
  if (oauthServer) {
    console.log('⚠️ OAuth server is already running');
    return;
  }

  oauthServer = http.createServer((req: any, res: any) => {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;
    const queryParams = parsedUrl.query;

    console.log('📥 OAuth callback received:', pathname);

    // OAuth 콜백 처리
    if (pathname === '/' || pathname === '/callback') {
      const code = queryParams.code as string | null;
      const error = queryParams.error as string | null;
      
      handleOAuthCallback(queryParams);

      // 성공 페이지 응답 (인증 코드 표시)
      if (code && !error) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>인증 완료</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: #333;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
              }
              h1 { 
                margin: 0 0 1rem 0; 
                font-size: 1.5rem;
                color: #333;
              }
              .code-container {
                margin: 1.5rem 0;
                padding: 1rem;
                background: #f5f5f5;
                border-radius: 8px;
                border: 2px solid #e0e0e0;
              }
              .code {
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                word-break: break-all;
                color: #333;
                margin: 0.5rem 0;
                padding: 0.75rem;
                background: white;
                border-radius: 4px;
                border: 1px solid #ddd;
              }
              .copy-btn {
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
              }
              .copy-btn:hover {
                background: #5568d3;
                transform: translateY(-1px);
              }
              .copy-btn:active {
                transform: translateY(0);
              }
              .copy-btn.copied {
                background: #4caf50;
              }
              .instructions {
                margin-top: 1rem;
                font-size: 0.85rem;
                color: #666;
                line-height: 1.5;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ 인증이 완료되었습니다!</h1>
              <p style="color: #666; margin-bottom: 1rem;">아래 인증 코드를 복사하여 앱에 입력하세요.</p>
              <div class="code-container">
                <div class="code" id="authCode">${code}</div>
                <button class="copy-btn" onclick="copyCode()">📋 코드 복사</button>
              </div>
              <div class="instructions">
                <p>1. 위의 "코드 복사" 버튼을 클릭하세요</p>
                <p>2. 앱으로 돌아가서 인증 코드 입력란에 붙여넣으세요</p>
                <p>3. "로그인" 버튼을 클릭하세요</p>
              </div>
            </div>
            <script>
              function copyCode() {
                const code = document.getElementById('authCode').textContent;
                navigator.clipboard.writeText(code).then(() => {
                  const btn = document.querySelector('.copy-btn');
                  const originalText = btn.textContent;
                  btn.textContent = '✅ 복사 완료!';
                  btn.classList.add('copied');
                  setTimeout(() => {
                    btn.textContent = originalText;
                    btn.classList.remove('copied');
                  }, 2000);
                }).catch(err => {
                  alert('복사에 실패했습니다. 코드를 직접 선택해서 복사하세요.');
                });
              }
            </script>
          </body>
          </html>
        `);
      } else if (error) {
        // 에러 페이지
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>인증 실패</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #f5f5f5;
                color: #333;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                max-width: 400px;
              }
              h1 { 
                margin: 0 0 1rem 0; 
                font-size: 1.5rem;
                color: #d32f2f;
              }
              p { 
                margin: 0; 
                font-size: 0.9rem;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ 인증 실패</h1>
              <p>${queryParams.error_description || error}</p>
              <p style="margin-top: 1rem;">이 창을 닫고 다시 시도하세요.</p>
            </div>
          </body>
          </html>
        `);
      } else {
        // 기본 성공 페이지 (코드가 없는 경우)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>인증 완료</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: #ffffff;
                color: #333;
              }
              .container {
                text-align: center;
                padding: 1.5rem 2rem;
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                max-width: 400px;
              }
              h1 { 
                margin: 0 0 0.75rem 0; 
                font-size: 1.25rem;
                color: #333;
              }
              p { 
                margin: 0; 
                font-size: 0.9rem;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ 인증이 완료되었습니다!</h1>
              <p>이 창을 닫고 앱으로 돌아가세요.</p>
            </div>
          </body>
          </html>
        `);
      }
    } else {
      // 404 응답
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  oauthServer.listen(OAUTH_REDIRECT_PORT, '127.0.0.1');

  oauthServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${OAUTH_REDIRECT_PORT} is already in use`);
    } else {
      console.error('❌ OAuth server error:', err);
    }
  });
}

// 로컬 HTTP 서버 종료
function stopOAuthServer() {
  if (oauthServer) {
    oauthServer.close(() => {
      console.log('🛑 OAuth callback server stopped');
      oauthServer = null;
    });
  }
}

// Windows에서 단일 인스턴스 체크 (커스텀 프로토콜 없이)
if (process.platform === 'win32') {
  const gotTheLock = app.requestSingleInstanceLock();
  
  if (!gotTheLock) {
    // 이미 다른 인스턴스가 실행 중이면 종료
    app.quit();
  } else {
    // 두 번째 인스턴스가 실행될 때 메인 윈도우 포커스
    app.on('second-instance', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}

// Visual C++ Redistributable 설치 확인 및 자동 설치
async function checkAndInstallVCRedist(): Promise<void> {
  if (process.platform !== 'win32' || isDev) {
    return; // Windows가 아니거나 개발 모드면 건너뛰기
  }

  try {
    // 레지스트리에서 VC++ Redistributable 설치 여부 확인
    const { execSync } = require('child_process');
    try {
      // VC++ 2015-2022 Redistributable 확인 (일반적인 키)
      execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Version', { stdio: 'ignore' });
      console.log('✅ Visual C++ Redistributable이 이미 설치되어 있습니다.');
      return;
    } catch {
      // 설치되지 않음
    }

    // VC++ Redistributable 설치 파일 경로
    // 포터블 버전과 설치 버전 모두 지원
    let vcRedistPath = path.join(process.resourcesPath, 'vc_redist.x64.exe');
    
    // 포터블 버전의 경우 실행 파일과 같은 디렉토리 확인
    if (!fs.existsSync(vcRedistPath) && app.isPackaged) {
      const portablePath = path.join(path.dirname(process.execPath), 'vc_redist.x64.exe');
      if (fs.existsSync(portablePath)) {
        vcRedistPath = portablePath;
      }
    }
    
    if (!fs.existsSync(vcRedistPath)) {
      console.warn('⚠️ VC++ Redistributable 설치 파일을 찾을 수 없습니다.');
      console.warn('   시도한 경로:', path.join(process.resourcesPath, 'vc_redist.x64.exe'));
      if (app.isPackaged) {
        console.warn('   포터블 경로:', path.join(path.dirname(process.execPath), 'vc_redist.x64.exe'));
      }
      return;
    }

    console.log('📦 Visual C++ Redistributable 설치 중...');
    // 자동 설치 (사용자 개입 없이)
    const { spawn } = require('child_process');
    const installer = spawn(vcRedistPath, ['/install', '/quiet', '/norestart'], {
      detached: true,
      stdio: 'ignore'
    });
    
    installer.on('error', (error: any) => {
      console.error('❌ VC++ Redistributable 설치 실패:', error);
    });
    
    installer.on('close', (code: number) => {
      if (code === 0) {
        console.log('✅ Visual C++ Redistributable 설치 완료');
      } else {
        console.warn('⚠️ VC++ Redistributable 설치 종료 코드:', code);
      }
    });
    
    installer.unref(); // 부모 프로세스 종료를 기다리지 않음
  } catch (error: any) {
    console.error('❌ VC++ Redistributable 확인/설치 중 오류:', error);
    // 오류가 발생해도 앱은 계속 실행
  }
}

app.whenReady().then(async () => {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 Starting app initialization...');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Visual C++ Redistributable 확인 및 설치 (비동기, 앱 시작을 막지 않음)
    checkAndInstallVCRedist().catch((error) => {
      console.error('VC++ Redistributable 확인 중 오류:', error);
    });
    
    // OAuth 콜백 서버 시작
    startOAuthServer();
    
    // 대기 중인 OAuth 코드가 있으면 처리 (서버 시작 전에 받은 경우)
    if ((global as any).pendingOAuthCode) {
      const pendingCode = (global as any).pendingOAuthCode;
      console.log('📥 Processing pending OAuth code:', pendingCode.substring(0, 20) + '...');
      delete (global as any).pendingOAuthCode;
      // 윈도우가 생성된 후 처리
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.webContents.send('oauth-code-received', { code: pendingCode });
          console.log('📤 Pending OAuth code sent to renderer process');
        }
      }, 1500);
    }
    
    // 데이터베이스 초기화
    try {
      initDatabase();('✅ Database initialized successfully');
    } catch (dbError: any) {
      // better-sqlite3가 Electron용으로 빌드되지 않은 경우 (개발 모드에서만 경고)
      if (dbError?.code === 'ERR_DLOPEN_FAILED' && isDev) {
        console.warn('⚠️ Database module requires rebuild for Electron');
        console.warn('   Run: npm run rebuild');
        console.warn('   Or install Python and build tools, then rebuild');
        console.warn('   Continuing without database functionality...');
        // 개발 모드에서는 데이터베이스 없이 계속 진행
      } else {
        console.error('❌ Fatal Error during database initialization:', dbError);
        console.error('Fatal Error during API initialization:', dbError);
        console.error('   Error message:', dbError?.message);
        console.error('   Error stack:', dbError?.stack);
        // 프로덕션 모드에서는 에러를 던짐
        if (!isDev) {
          throw dbError;
        }
      }
    }
    
    // Google OAuth 초기화 (환경 변수에서 Secret 읽기)
    try {
      initializeGoogleOAuth();
    } catch (oauthError: any) {
      console.error('❌ Fatal Error during Google OAuth initialization:', oauthError);
      console.error('   Error type:', oauthError?.constructor?.name);
      console.error('   Error message:', oauthError?.message);
      console.error('   Error stack:', oauthError?.stack);
    }
    
    // Google API 토큰 불러오기 시도
    try {
      await loadToken();
    } catch (tokenError: any) {
      // 토큰 로드 실패는 로그인 전 정상적인 상황이므로 에러 로그 제거
    }
    
    // macOS 메뉴 바 설정
    if (process.platform === 'darwin') {
      const template: Electron.MenuItemConstructorOptions[] = [
        {
          label: app.getName(),
          submenu: [
            { role: 'about', label: `${app.getName()} 정보` },
            { type: 'separator' },
            { role: 'services', label: '서비스' },
            { type: 'separator' },
            { role: 'hide', label: `${app.getName()} 숨기기` },
            { role: 'hideOthers', label: '나머지 숨기기' },
            { role: 'unhide', label: '모두 보이기' },
            { type: 'separator' },
            { role: 'quit', label: `${app.getName()} 종료` }
          ]
        },
        {
          label: '파일',
          submenu: [
            { role: 'close', label: '창 닫기' }
          ]
        },
        {
          label: '편집',
          submenu: [
            { role: 'undo', label: '실행 취소' },
            { role: 'redo', label: '다시 실행' },
            { type: 'separator' },
            { role: 'cut', label: '잘라내기' },
            { role: 'copy', label: '복사' },
            { role: 'paste', label: '붙여넣기' },
            { role: 'selectAll', label: '모두 선택' }
          ]
        },
        {
          label: '보기',
          submenu: [
            { role: 'reload', label: '새로고침' },
            { role: 'forceReload', label: '강제 새로고침' },
            { role: 'toggleDevTools', label: '개발자 도구' },
            { type: 'separator' },
            { role: 'resetZoom', label: '실제 크기' },
            { role: 'zoomIn', label: '확대' },
            { role: 'zoomOut', label: '축소' },
            { type: 'separator' },
            { role: 'togglefullscreen', label: '전체 화면' }
          ]
        },
        {
          label: '창',
          submenu: [
            { role: 'minimize', label: '최소화' },
            { role: 'close', label: '닫기' },
            { type: 'separator' },
            { role: 'front', label: '맨 앞으로 가져오기' }
          ]
        },
        {
          label: '도움말',
          submenu: [
            {
              label: `${app.getName()} 정보`,
              click: () => {
                // 정보 다이얼로그 표시 (선택사항)
              }
            }
          ]
        }
      ];
      
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
      console.log('✅ macOS menu bar configured');
    }
    
    console.log('📝 Creating application window...');
    createWindow();
    console.log('✅ Application window created successfully');
  } catch (fatalError: any) {
    console.error('❌❌❌ FATAL ERROR during app initialization ❌❌❌');
    console.error('Fatal Error during API initialization:', fatalError);
    console.error('   Error name:', fatalError?.name);
    console.error('   Error message:', fatalError?.message);
    console.error('   Error stack:', fatalError?.stack);
    if (fatalError?.cause) {
      console.error('   Error cause:', fatalError.cause);
    }
    // 앱을 계속 실행하되, 에러 로그 출력
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 정적 파일 서버 종료
function stopStaticFileServer() {
  if (staticFileServer) {
    console.log('🛑 Stopping static file server...');
    staticFileServer.close(() => {
      console.log('✅ Static file server stopped');
      staticFileServer = null;
    });
  }
}

app.on('before-quit', (event) => {
  // 정적 파일 서버 종료
  stopStaticFileServer();
  // OAuth 서버 종료
  stopOAuthServer();
  // 데이터베이스 연결 종료 (에러가 발생해도 앱은 종료)
  try {
    if (closeDatabase) {
      closeDatabase();
    }
  } catch (error: any) {
    console.error('⚠️ Error closing database during quit:', error?.message);
    // 에러가 발생해도 앱 종료는 계속 진행
  }
});

app.on('will-quit', (event) => {
  // 강제 종료 보장
  // 데이터베이스가 제대로 닫히지 않아도 앱은 종료되어야 함
  try {
    if (closeDatabase) {
      closeDatabase();
    }
  } catch (error: any) {
    console.error('⚠️ Error closing database during will-quit:', error?.message);
  }
});

// ==================== 데이터베이스 관련 IPC 핸들러 ====================

// 메모 저장
ipcMain.handle('db-save-memo', (event, todoId: string, content: string) => {
  const db = getDatabase();
  const id = `${todoId}-memo`;
  const now = Date.now();
  
  db.prepare(`
    INSERT OR REPLACE INTO memos (id, todo_id, content, created_at, updated_at)
    VALUES (?, ?, ?, COALESCE((SELECT created_at FROM memos WHERE id = ?), ?), ?)
  `).run(id, todoId, content, id, now, now);
  
  return { success: true };
});

// 메모 불러오기
ipcMain.handle('db-get-memo', (event, todoId: string) => {
  const db = getDatabase();
  const memo = db.prepare('SELECT * FROM memos WHERE todo_id = ?').get(todoId);
  return memo || null;
});

// 메모 삭제
ipcMain.handle('db-delete-memo', (event, todoId: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM memos WHERE todo_id = ?').run(todoId);
  return { success: true };
});

// 헤더 이미지 저장
ipcMain.handle('db-save-header-image', (event, imagePath: string) => {
  const db = getDatabase();
  const id = 'header-banner';
  const now = Date.now();
  
  db.prepare(`
    INSERT OR REPLACE INTO header_images (id, image_path, created_at, updated_at)
    VALUES (?, ?, COALESCE((SELECT created_at FROM header_images WHERE id = ?), ?), ?)
  `).run(id, imagePath, id, now, now);
  
  return { success: true };
});

// 헤더 이미지 불러오기
ipcMain.handle('db-get-header-image', () => {
  const db = getDatabase();
  const image = db.prepare('SELECT * FROM header_images WHERE id = ?').get('header-banner');
  return image || null;
});

// 헤더 이미지 삭제
ipcMain.handle('db-delete-header-image', () => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM header_images WHERE id = ?').run('header-banner');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to delete header image:', error);
    return { success: false, error: error.message };
  }
});

// 스티커 저장
ipcMain.handle('db-save-sticker', (
  event,
  date: string,
  imagePath: string,
  positionX: number,
  positionY: number,
  width: number,
  height: number,
  isLocked: boolean
) => {
  const db = getDatabase();
  const id = `${date}-${Date.now()}`;
  const now = Date.now();
  
  db.prepare(`
    INSERT INTO calendar_stickers (id, date, image_path, position_x, position_y, width, height, is_locked, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, date, imagePath, positionX, positionY, width, height, isLocked ? 1 : 0, now, now);
  
  return { success: true, id };
});

// 날짜별 스티커 불러오기
ipcMain.handle('db-get-stickers', (event, date: string) => {
  const db = getDatabase();
  const stickers = db.prepare('SELECT * FROM calendar_stickers WHERE date = ?').all(date);
  return stickers.map((s: any) => ({
    ...s,
    is_locked: s.is_locked === 1,
  }));
});

// 모든 스티커 불러오기 (캘린더 전체용)
ipcMain.handle('db-get-all-stickers', () => {
  const db = getDatabase();
  const stickers = db.prepare('SELECT * FROM calendar_stickers').all();
  return stickers.map((s: any) => ({
    ...s,
    is_locked: s.is_locked === 1,
  }));
});

// 스티커 업데이트
ipcMain.handle('db-update-sticker', (
  event,
  id: string,
  positionX?: number,
  positionY?: number,
  isLocked?: boolean
) => {
  const db = getDatabase();
  const updates: string[] = [];
  const values: any[] = [];
  
  if (positionX !== undefined) {
    updates.push('position_x = ?');
    values.push(positionX);
  }
  if (positionY !== undefined) {
    updates.push('position_y = ?');
    values.push(positionY);
  }
  if (isLocked !== undefined) {
    updates.push('is_locked = ?');
    values.push(isLocked ? 1 : 0);
  }
  
  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    db.prepare(`UPDATE calendar_stickers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }
  
  return { success: true };
});

// 스티커 삭제
ipcMain.handle('db-delete-sticker', (event, id: string) => {
  const db = getDatabase();
  db.prepare('DELETE FROM calendar_stickers WHERE id = ?').run(id);
  return { success: true };
});

// 스티커 재로드 트리거 (React에서 강제 재로드를 위해 사용)
ipcMain.handle('reload-stickers', () => {
  // 실제로는 아무 작업도 하지 않지만, React에서 이 메시지를 받으면
  // 컴포넌트가 스티커 목록을 다시 불러오도록 트리거 역할
  return { success: true };
});

// ==================== 스티커 이미지 파일 저장 관련 IPC 핸들러 ====================

// Base64 이미지를 파일로 저장
ipcMain.handle('save-sticker-image', (event, base64Data: string) => {
  try {
    // Base64 데이터에서 실제 이미지 데이터 추출
    const base64Match = base64Data.match(/^data:image\/([a-z]+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid base64 image data');
    }
    
    const imageFormat = base64Match[1] || 'png';
    const base64Content = base64Match[2];
    
    // 이미지 디렉토리 경로 (AppData/Roaming/todadot/images)
    const imagesDir = path.join(app.getPath('userData'), 'images');
    
    // 디렉토리가 없으면 생성
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // 고유한 파일명 생성
    const fileName = `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${imageFormat}`;
    const filePath = path.join(imagesDir, fileName);
    
    // Base64를 버퍼로 변환하고 파일로 저장
    const imageBuffer = Buffer.from(base64Content, 'base64');
    fs.writeFileSync(filePath, imageBuffer);
    
    // 파일 경로만 반환 (file:// 프로토콜 제거)
    return { success: true, filePath: filePath };
  } catch (error: any) {
    console.error('❌ Failed to save sticker image:', error);
    return { success: false, error: error.message };
  }
});

// 이미지 파일을 읽어서 base64로 변환하여 반환
ipcMain.handle('load-sticker-image', (event, imagePath: string) => {
  try {
    // file:// 프로토콜 제거
    let cleanPath = imagePath.replace(/^file:\/\//, '');
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(cleanPath)) {
      throw new Error('Image file not found: ' + cleanPath);
    }
    
    // 파일을 읽어서 base64로 변환
    const imageBuffer = fs.readFileSync(cleanPath);
    const base64Data = imageBuffer.toString('base64');
    
    // 파일 확장자로 MIME 타입 결정
    const ext = path.extname(cleanPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    
    // data URI 형식으로 반환
    return { 
      success: true, 
      dataUrl: `data:${mimeType};base64,${base64Data}` 
    };
  } catch (error: any) {
    console.error('❌ Failed to load sticker image:', error);
    return { success: false, error: error.message };
  }
});

// ==================== 스티커 레이아웃 관련 IPC 핸들러 ====================

// 스티커 레이아웃 저장
ipcMain.handle('db-save-sticker-layout', (
  event,
  id: string,
  name: string,
  resolutionWidth: number,
  resolutionHeight: number,
  stickersData: string,
  savedAt: number
) => {
  try {
    if (!dbSaveStickerLayout) {
      throw new Error('Database module not initialized');
    }
    dbSaveStickerLayout(id, name, resolutionWidth, resolutionHeight, stickersData, savedAt);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to save sticker layout:', error);
    return { success: false, error: error.message };
  }
});

// 모든 스티커 레이아웃 불러오기
ipcMain.handle('db-get-all-sticker-layouts', () => {
  try {
    if (!dbGetAllStickerLayouts) {
      throw new Error('Database module not initialized');
    }
    const layouts = dbGetAllStickerLayouts();
    return { success: true, layouts };
  } catch (error: any) {
    console.error('❌ Failed to get sticker layouts:', error);
    return { success: false, error: error.message, layouts: [] };
  }
});

// 스티커 레이아웃 불러오기 (ID로)
ipcMain.handle('db-get-sticker-layout', (event, id: string) => {
  try {
    if (!dbGetStickerLayout) {
      throw new Error('Database module not initialized');
    }
    const layout = dbGetStickerLayout(id);
    return { success: true, layout };
  } catch (error: any) {
    console.error('❌ Failed to get sticker layout:', error);
    return { success: false, error: error.message, layout: null };
  }
});

// 스티커 레이아웃 삭제
ipcMain.handle('db-delete-sticker-layout', (event, id: string) => {
  try {
    if (!dbDeleteStickerLayout) {
      throw new Error('Database module not initialized');
    }
    dbDeleteStickerLayout(id);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to delete sticker layout:', error);
    return { success: false, error: error.message };
  }
});

// 데이터베이스 전체 초기화 (exe 패키징 전 초기화용)
ipcMain.handle('db-clear-all-data', () => {
  try {
    if (!clearAllDatabaseData) {
      throw new Error('Database module not initialized');
    }
    clearAllDatabaseData();
    return { success: true };
  } catch (error: any) {
    console.error('❌ Failed to clear database:', error);
    return { success: false, error: error.message };
  }
});

// ==================== Google API 관련 IPC 핸들러 ====================

// Google 인증 정보 설정
ipcMain.handle('google-set-credentials', (event, clientId: string, clientSecret: string) => {
  console.log('📡 IPC call: google-set-credentials');
  console.log('   Client ID:', clientId ? clientId.substring(0, 20) + '...' : 'null');
  console.log('   Client Secret length:', clientSecret ? clientSecret.length : 0);
  
  try {
    if (!setGoogleCredentials) {
      console.error('❌ setGoogleCredentials function is not available');
      return { success: false, error: 'Google API 모듈이 초기화되지 않았습니다.' };
    }
    
    console.log('   Calling setGoogleCredentials...');
    const initSuccess = setGoogleCredentials(clientId, clientSecret);
    console.log('   setGoogleCredentials returned:', initSuccess);
    
    // 초기화 후 즉시 상태 확인
    if (isOAuthInitialized) {
      const isReady = isOAuthInitialized();
      console.log('   Immediate check after setGoogleCredentials:', isReady);
      console.log('   initSuccess:', initSuccess);
      console.log('   isReady:', isReady);
      
      if (initSuccess && isReady) {
        console.log('✅ Google credentials set and OAuth initialized successfully');
        return { success: true };
      } else {
        console.error('❌ Google credentials saved but OAuth initialization failed');
        console.error('   initSuccess:', initSuccess);
        console.error('   isReady:', isReady);
        return { success: false, error: '인증 정보는 저장되었지만 OAuth 초기화에 실패했습니다. Client Secret을 확인해주세요.' };
      }
    } else {
      console.error('❌ isOAuthInitialized function is not available');
      return { success: false, error: 'OAuth 초기화 확인 함수를 사용할 수 없습니다.' };
    }
  } catch (error: any) {
    console.error('❌ Failed to set Google credentials:', error);
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    return { success: false, error: error.message };
  }
});

// 인증 URL 가져오기
ipcMain.handle('google-get-auth-url', () => {
  console.log('📡 IPC call: google-get-auth-url');
  try {
    const url = getAuthUrl();
    console.log('✅ Auth URL generated successfully (length:', url.length, 'chars)');
    return { success: true, url };
  } catch (error: any) {
    console.error('❌ Failed to generate auth URL:', error?.message);
    return { success: false, error: error.message };
  }
});

// 인증 코드로 토큰 교환
ipcMain.handle('google-exchange-code', async (event, code: string) => {
  try {
    const tokens = await exchangeCodeForToken(code);
    return { success: true, tokens }; // 토큰 정보 반환 (Firebase 인증용)
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 인증 상태 확인
ipcMain.handle('google-is-authenticated', () => {
  return isAuthenticated();
});

// OAuth 초기화 상태 확인
ipcMain.handle('google-is-oauth-ready', () => {
  console.log('📡 IPC call: google-is-oauth-ready');
  console.log('   Function available:', typeof isOAuthInitialized === 'function');
  console.log('   Function reference:', isOAuthInitialized ? 'exists' : 'null');
  
  if (!isOAuthInitialized) {
    console.error('❌ isOAuthInitialized function is not available');
    return false;
  }
  
  try {
    const isReady = isOAuthInitialized();
    console.log('📡 IPC call: google-is-oauth-ready ->', isReady);
    console.log('   isReady value:', isReady);
    console.log('   isReady type:', typeof isReady);
    return isReady;
  } catch (error: any) {
    console.error('❌ Error calling isOAuthInitialized:', error);
    console.error('   Error message:', error?.message);
    console.error('   Error stack:', error?.stack);
    return false;
  }
});

// 로그아웃
ipcMain.handle('google-logout', async () => {
  try {
    await logout();
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error during logout:', error);
    return { success: false, error: error.message };
  }
});

// Google Calendar 이벤트 가져오기
ipcMain.handle('google-get-events', async (event, timeMin: string, timeMax: string) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const calendar = getCalendarApi();
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    return { success: true, events: response.data.items || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Calendar 이벤트 생성
ipcMain.handle('google-create-event', async (event, eventData: any) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const calendar = getCalendarApi();
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
    });
    
    return { success: true, event: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Calendar 이벤트 수정
ipcMain.handle('google-update-event', async (event, eventId: string, eventData: any) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const calendar = getCalendarApi();
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: eventData,
    });
    
    return { success: true, event: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Calendar 이벤트 삭제
ipcMain.handle('google-delete-event', async (event, eventId: string) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const calendar = getCalendarApi();
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Tasks 가져오기
ipcMain.handle('google-get-tasks', async (event, tasklistId: string = '@default') => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const tasks = getTasksApi();
    const response = await tasks.tasks.list({
      tasklist: tasklistId,
    });
    
    return { success: true, tasks: response.data.items || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Tasks 생성
ipcMain.handle('google-create-task', async (event, tasklistId: string, taskData: any) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const tasks = getTasksApi();
    const response = await tasks.tasks.insert({
      tasklist: tasklistId,
      requestBody: taskData,
    });
    
    return { success: true, task: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Tasks 수정
ipcMain.handle('google-update-task', async (event, tasklistId: string, taskId: string, taskData: any) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const tasks = getTasksApi();
    const response = await tasks.tasks.update({
      tasklist: tasklistId,
      task: taskId,
      requestBody: taskData,
    });
    
    return { success: true, task: response.data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Google Tasks 삭제
ipcMain.handle('google-delete-task', async (event, tasklistId: string, taskId: string) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }
    
    const tasks = getTasksApi();
    await tasks.tasks.delete({
      tasklist: tasklistId,
      task: taskId,
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ==================== Firebase 관련 IPC 핸들러 ====================

// Firebase 설정 저장
ipcMain.handle('firebase-set-config', (event, config: FirebaseConfig) => {
  try {
    saveFirebaseConfig(config);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Firebase 설정 불러오기
ipcMain.handle('firebase-get-config', () => {
  try {
    const config = loadFirebaseConfig();
    return { success: true, config };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// ==================== PDF 내보내기 관련 IPC 핸들러 ====================

// HTML 콘텐츠를 PDF로 변환
ipcMain.handle('print-to-pdf', async (event: any, htmlContent: string, options?: {
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
  landscape?: boolean;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}) => {
  console.log('📄 PDF 생성 요청 받음');
  console.log('📏 HTML 콘텐츠 길이:', htmlContent?.length || 0);
  console.log('📋 옵션:', JSON.stringify(options || {}));
  
  // HTML 콘텐츠 유효성 검사
  if (!htmlContent || typeof htmlContent !== 'string') {
    console.error('❌ 유효하지 않은 HTML 콘텐츠');
    return Promise.resolve({ 
      success: false, 
      error: 'Invalid HTML content' 
    });
  }
  
  return new Promise((resolve) => {
    let tempFilePath: string | null = null;
    
    try {
      // 임시 파일로 저장 (큰 HTML 콘텐츠 처리)
      tempFilePath = path.join(app.getPath('temp'), `todadot-pdf-${Date.now()}.html`);
      fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
      console.log('💾 임시 HTML 파일 생성:', tempFilePath);

      // 숨겨진 BrowserWindow 생성
      const pdfWindow = new BrowserWindow({
        show: false,
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          enableBlinkFeatures: 'CSSColorSchemeUARendering',
        },
      });

      console.log('🪟 PDF용 BrowserWindow 생성됨');

      // 임시 파일을 file:// 프로토콜로 로드
      const fileUrl = `file://${tempFilePath.replace(/\\/g, '/')}`;
      console.log('📂 파일 URL:', fileUrl);
      pdfWindow.loadURL(fileUrl);

      // 페이지 로드 완료 대기
      pdfWindow.webContents.once('did-finish-load', async () => {
        try {
          console.log('✅ HTML 로드 완료, 렌더링 대기 중...');
          
          // 추가 렌더링 대기 (CSS와 폰트 로딩 완료)
          await new Promise((resolveWait) => setTimeout(resolveWait, 500));

          // PDF 옵션 설정
          const pdfOptions: any = {
            printBackground: true,
            pageSize: options?.pageSize || 'A4',
            landscape: options?.landscape !== undefined ? options.landscape : true, // 기본값을 가로로 변경
          };

          // 마진 설정 (인치 단위) - 최소 여백으로 설정
          if (options?.margins) {
            pdfOptions.margins = {
              top: options.margins.top || 0.2,    // 0.2 인치 (약 5mm)
              right: options.margins.right || 0.2,
              bottom: options.margins.bottom || 0.2,
              left: options.margins.left || 0.2,
            };
          } else {
            pdfOptions.margins = {
              top: 0.2,    // 0.2 인치 (약 5mm) - 최소 여백
              right: 0.2,
              bottom: 0.2,
              left: 0.2,
            };
          }

          console.log('📄 PDF 생성 중...', pdfOptions);

          // PDF 생성
          const pdfData = await pdfWindow.webContents.printToPDF(pdfOptions);
          
          console.log('✅ PDF 생성 완료, 크기:', pdfData.length, 'bytes');
          
          // 창 닫기
          pdfWindow.close();
          
          // 임시 파일 삭제
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
              console.log('🗑️ 임시 파일 삭제됨');
            } catch (unlinkError) {
              console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
            }
          }

          // Buffer를 Base64로 변환하여 반환
          resolve({ success: true, data: pdfData.toString('base64') });
        } catch (error: any) {
          console.error('❌ PDF 생성 중 오류:', error);
          console.error('   에러 메시지:', error.message);
          console.error('   에러 스택:', error.stack);
          
          if (!pdfWindow.isDestroyed()) {
            pdfWindow.close();
          }
          
          // 임시 파일 삭제
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {
              console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
            }
          }
          
          // reject 대신 resolve로 에러 반환 (IPC 직렬화 문제 방지)
          resolve({ 
            success: false, 
            error: error.message || error.toString() || 'PDF generation failed' 
          });
        }
      });

      // 로드 오류 처리
      pdfWindow.webContents.once('did-fail-load', (event: any, errorCode: any, errorDescription: string) => {
        console.error('❌ HTML 로드 실패:', errorCode, errorDescription);
        
        if (!pdfWindow.isDestroyed()) {
          pdfWindow.close();
        }
        
        // 임시 파일 삭제
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (unlinkError) {
            console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
          }
        }
        
        resolve({ 
          success: false, 
          error: `Failed to load HTML: ${errorDescription || errorCode}` 
        });
      });

      // 타임아웃 설정 (30초)
      setTimeout(() => {
        if (!pdfWindow.isDestroyed()) {
          console.error('❌ PDF 생성 타임아웃');
          pdfWindow.close();
          
          // 임시 파일 삭제
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {
              console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
            }
          }
          
          resolve({ success: false, error: 'PDF generation timeout' });
        }
      }, 30000);
    } catch (error: any) {
      console.error('❌ PDF 핸들러 초기화 오류:', error);
      console.error('   에러 메시지:', error.message);
      console.error('   에러 스택:', error.stack);
      
      // 임시 파일 삭제
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (unlinkError) {
          console.warn('⚠️ 임시 파일 삭제 실패:', unlinkError);
        }
      }
      
      // reject 대신 resolve로 에러 반환
      resolve({ 
        success: false, 
        error: error.message || error.toString() || 'PDF handler initialization failed' 
      });
    }
  });
});

// Google OAuth 토큰 가져오기 (Firebase 인증용)
ipcMain.handle('firebase-get-google-tokens', () => {
  try {
    const tokens = getTokens();
    if (!tokens) {
      return { success: false, error: 'No tokens found' };
    }
    return { success: true, tokens };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 초기 데이터 로드 (로그인 후)
ipcMain.handle('load-initial-data', async (event, timeMin: string, timeMax: string) => {
  try {
    if (!isAuthenticated()) {
      return { success: false, error: 'Not authenticated' };
    }

    // Google Calendar 이벤트 로드
    const calendar = getCalendarApi();
    const calendarResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Google Tasks 로드
    const tasks = getTasksApi();
    const tasksResponse = await tasks.tasks.list({
      tasklist: '@default',
    });

    return {
      success: true,
      calendar: { success: true, events: calendarResponse.data.items || [] },
      tasks: { success: true, tasks: tasksResponse.data.items || [] },
      // 일기/메모는 React에서 Firebase로 직접 로드
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});