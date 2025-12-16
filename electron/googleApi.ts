import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { app } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// .env 파일 로드 (환경 변수)
const envPath = path.resolve(process.cwd(), '.env');
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error('⚠️ Failed to load .env file:', dotenvResult.error);
} else {
  console.log('✅ .env file loaded successfully');
  console.log('   Parsed keys:', dotenvResult.parsed ? Object.keys(dotenvResult.parsed).length : 0);
  // Secret 존재 여부 확인 (값은 출력하지 않음)
  if (process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ GOOGLE_CLIENT_SECRET is set (length:', process.env.GOOGLE_CLIENT_SECRET.length, 'chars)');
  } else {
    console.error('❌ GOOGLE_CLIENT_SECRET is not set in .env file');
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Google OAuth Client ID (하드코딩)
const GOOGLE_CLIENT_ID = '220403143188-7ip0cu2ct0sr37hdh1his9kdbo930v5e.apps.googleusercontent.com';

// 토큰 저장 경로
const userDataPath = app.getPath('userData');
const tokenPath = path.join(userDataPath, 'google-token.json');
const credentialsPath = path.join(userDataPath, 'google-credentials.json');

/**
 * Google API Manager 클래스
 * 모든 OAuth 관련 변수를 클래스 인스턴스 속성으로 관리하여 변수 공유 문제 해결
 */
class GoogleApiManager {
  // 클래스 속성으로 OAuth 관련 변수 관리
  private oauth2Client: OAuth2Client | null = null;
  private calendarApi: ReturnType<typeof google.calendar> | null = null;
  private tasksApi: ReturnType<typeof google.tasks> | null = null;
  private isReady: boolean = false; // OAuth 초기화 완료 상태

  /**
   * Google OAuth Client Secret 가져오기
   */
  private getGoogleClientSecret(): string {
    console.log('🔍 Checking GOOGLE_CLIENT_SECRET...');
    
    // 1. Vite define으로 주입된 값 시도 (빌드 시점에 치환됨)
    // @ts-ignore - Vite가 빌드 시점에 이 값을 주입할 수 있습니다
    const viteSecret: string | undefined = process.env.VITE_GOOGLE_CLIENT_SECRET;
    
    // 2. 런타임 환경 변수 (개발 모드에서 .env 파일에서 로드됨)
    const runtimeSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // 3. 저장된 credentials 파일에서 읽기 (사용자가 설정 페이지에서 입력한 경우)
    let savedSecret: string | undefined;
    if (fs.existsSync(credentialsPath)) {
      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
        savedSecret = credentials.clientSecret;
        if (savedSecret) {
          console.log('📁 Found saved Client Secret in credentials file');
        }
      } catch (error) {
        console.warn('⚠️ Failed to read credentials file:', error);
      }
    }
    
    // 우선순위: Vite define > 런타임 env > 저장된 credentials
    const secret = viteSecret || runtimeSecret || savedSecret;
    
    if (!secret) {
      console.error('❌ GOOGLE_CLIENT_SECRET is undefined or empty');
      console.error('   VITE_GOOGLE_CLIENT_SECRET:', viteSecret ? `present (${viteSecret.length} chars)` : 'missing');
      console.error('   GOOGLE_CLIENT_SECRET:', runtimeSecret ? `present (${runtimeSecret.length} chars)` : 'missing');
      console.error('   Saved credentials:', savedSecret ? `present (${savedSecret.length} chars)` : 'missing');
      console.error('   Make sure .env file exists and contains GOOGLE_CLIENT_SECRET=...');
      console.error('   Or enter Client Secret in the Google API Settings page.');
      throw new Error(
        'GOOGLE_CLIENT_SECRET이 설정되지 않았습니다. ' +
        '.env 파일에 GOOGLE_CLIENT_SECRET을 설정하거나, ' +
        'Google API 설정 페이지에서 Client Secret을 입력해주세요.'
      );
    }
    console.log('✅ GOOGLE_CLIENT_SECRET loaded (length:', secret.length, 'chars)');
    const source = viteSecret ? 'Vite define (build-time)' : runtimeSecret ? 'Runtime env var' : 'Saved credentials';
    console.log('   Source:', source);
    return secret;
  }

  /**
   * Google API 인증 정보 초기화
   * 데스크톱 앱 유형: Client Secret은 토큰 교환 시에만 사용되며, 인증 URL 생성에는 사용되지 않음
   */
  initializeGoogleOAuth(): boolean {
    try {
      let clientSecret: string | undefined;
      try {
        clientSecret = this.getGoogleClientSecret();
      } catch (error: any) {
        // 데스크톱 앱 유형에서는 Client Secret 없이도 인증 URL 생성 가능
        clientSecret = undefined;
      }
      
      // OAuth2Client 생성: Client Secret은 토큰 교환 시에만 사용됨
      // 인증 URL 생성 시에는 client_id와 redirect_uri만 사용됨
      this.oauth2Client = new OAuth2Client({
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: clientSecret, // undefined일 수 있음 (데스크톱 앱 유형)
        redirectUri: 'http://localhost:8888', // Loopback redirect URI 사용
      });

      this.calendarApi = google.calendar({ version: 'v3', auth: this.oauth2Client });
      // Tasks API는 제거됨 (Google Tasks Scope 제거)
      this.tasksApi = null;
      
      // 초기화 성공 시 isReady를 true로 설정
      this.isReady = true;
      
      return true;
    } catch (error: any) {
      console.error('❌❌❌ Failed to initialize Google OAuth ❌❌❌');
      console.error('   Error type:', error?.constructor?.name);
      console.error('   Error message:', error?.message);
      console.error('   Error stack:', error?.stack);
      this.oauth2Client = null;
      this.calendarApi = null;
      this.tasksApi = null; // Tasks API는 제거됨
      this.isReady = false;
      return false;
    }
  }

  /**
   * OAuth 초기화 상태 확인
   */
  isOAuthInitialized(): boolean {
    // Tasks API는 제거되었으므로 tasksApi 체크 제거
    const isReady = this.oauth2Client !== null && this.calendarApi !== null;
    // isReady 속성도 업데이트
    this.isReady = isReady;
    console.log('🔍 OAuth initialization check:', {
      oauth2Client: this.oauth2Client !== null,
      calendarApi: this.calendarApi !== null,
      tasksApi: 'removed (not used)',
      isReady,
      'this.isReady': this.isReady,
    });
    return isReady;
  }

  /**
   * Google API 인증 정보 설정
   * 사용자가 Google API 설정 페이지에서 입력한 Client Secret을 저장합니다.
   */
  setGoogleCredentials(clientId?: string, clientSecret?: string): boolean {
    console.log('📝 Setting Google credentials...');
    
    // Client Secret이 제공된 경우 credentials 파일에 저장
    if (clientSecret) {
      try {
        const credentials = {
          clientId: clientId || GOOGLE_CLIENT_ID,
          clientSecret: clientSecret,
          savedAt: Date.now(),
        };
        fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
        console.log('✅ Google credentials saved to:', credentialsPath);
      } catch (error) {
        console.error('❌ Failed to save Google credentials:', error);
        throw error;
      }
    }
    
    // OAuth 초기화 (저장된 credentials 또는 환경 변수 사용)
    console.log('🔄 Re-initializing Google OAuth with new credentials...');
    console.log('   Current state before init:', {
      oauth2Client: this.oauth2Client !== null,
      calendarApi: this.calendarApi !== null,
      tasksApi: this.tasksApi !== null,
      isReady: this.isReady,
    });
    
    const initSuccess = this.initializeGoogleOAuth();
    
    // 초기화 후 실제 상태 확인 (즉시)
    const isActuallyReady = this.isOAuthInitialized();
    console.log('🔍 Verification after re-initialization:', {
      initSuccess,
      isActuallyReady,
      oauth2Client: this.oauth2Client !== null,
      calendarApi: this.calendarApi !== null,
      tasksApi: this.tasksApi !== null,
      'this.isReady': this.isReady,
    });
    
    // 변수 직접 확인
    console.log('🔍 Direct variable check:', {
      'this.oauth2Client !== null': this.oauth2Client !== null,
      'this.calendarApi !== null': this.calendarApi !== null,
      'this.tasksApi !== null': this.tasksApi !== null,
      'this.isReady': this.isReady,
      'typeof this.oauth2Client': typeof this.oauth2Client,
      'typeof this.calendarApi': typeof this.calendarApi,
      'typeof this.tasksApi': typeof this.tasksApi,
    });
    
    if (initSuccess && isActuallyReady) {
      console.log('✅ OAuth re-initialized successfully after credentials update');
      this.isReady = true; // 명시적으로 설정
      return true;
    } else {
      console.error('❌ OAuth re-initialization failed after credentials update');
      console.error('   initSuccess:', initSuccess);
      console.error('   isActuallyReady:', isActuallyReady);
      console.error('   this.isReady:', this.isReady);
      this.isReady = false; // 명시적으로 설정
      return false;
    }
  }

  /**
   * 저장된 인증 정보 불러오기 (레거시 호환성)
   */
  loadGoogleCredentials(): { clientId: string; clientSecret: string } | null {
    try {
      return {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: this.getGoogleClientSecret(),
      };
    } catch (error) {
      console.error('Failed to load Google credentials:', error);
      return null;
    }
  }

  /**
   * OAuth 2.0 인증 URL 생성
   * 데스크톱 앱 유형: Client Secret 없이 client_id와 redirect_uri만으로 인증 URL 생성
   * generateAuthUrl()은 자동으로 client_secret을 URL에 포함하지 않음
   * 재로그인 시에도 첫 로그인과 동일한 깨끗한 상태에서 시작
   */
  getAuthUrl(): string {
    // 재인증 시 이전 OAuth2Client가 남아있을 수 있으므로 완전히 초기화
    if (this.oauth2Client) {
      const currentCredentials = (this.oauth2Client as any).credentials;
      if (currentCredentials && (currentCredentials.access_token || currentCredentials.refresh_token)) {
        this.oauth2Client.setCredentials({});
      }
    }
    
    if (!this.oauth2Client) {
      const initSuccess = this.initializeGoogleOAuth();
      if (!initSuccess) {
        console.error('❌ Failed to initialize OAuth2Client');
        throw new Error('Failed to initialize OAuth2Client');
      }
    }

    if (!this.oauth2Client) {
      console.error('❌ OAuth2Client is still null after initialization attempt');
      throw new Error('OAuth2Client not initialized');
    }

    // 통합 스코프 목록 (Calendar 및 Tasks Scope 제거됨)
    // Google OAuth 2.0 표준 사용자 정보 Scope 사용
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email', // 사용자 이메일 정보
      'https://www.googleapis.com/auth/userinfo.profile', // 사용자 프로필 정보
    ];
    
    // Scope를 공백으로 구분된 문자열로 변환 (Google OAuth 표준)
    const scopeString = scopes.join(' ');
    
    // 데스크톱 앱 OAuth 2.0 파라미터 설정
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // 리프레시 토큰을 받기 위해 필수
      scope: scopeString, // 공백으로 구분된 Scope 문자열
      prompt: 'consent', // 매번 동의 화면 표시 (리프레시 토큰 받기 위해)
      // response_type: 'code'는 generateAuthUrl()이 자동으로 설정 (명시 불필요)
      // redirect_uri는 OAuth2Client 생성 시 설정한 값 사용
    });
    
    // 생성된 URL에 client_secret이 포함되어 있는지 확인 (에러 검출용)
    const urlObj = new URL(authUrl);
    const hasClientSecret = urlObj.searchParams.has('client_secret');
    
    if (hasClientSecret) {
      console.error('❌❌❌ CRITICAL ERROR: client_secret found in auth URL! ❌❌❌');
      console.error('   This should NOT happen for desktop app type!');
      console.error('   The URL contains client_secret parameter, which will cause 400 invalid_request error.');
      console.error('   Please check OAuth2Client initialization and generateAuthUrl() implementation.');
    }
    
    // URL에 포함된 모든 파라미터 출력
    urlObj.searchParams.forEach((value, key) => {
      if (key === 'scope') {
        // Scope를 쉼표로 구분하여 출력 (Google OAuth는 공백으로 구분하지만 로그는 쉼표로 표시)
        const scopeList = value.split(' ').join(', ');
        console.log(`   - ${key}: ${scopeList}`);
        console.log(`   - ${key} (comma-separated): ${scopeList}`);
      } else {
        console.log(`   - ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
      }
    });
    
    console.log('✅ Auth URL generated successfully (length:', authUrl.length, 'chars)');
    return authUrl;
  }

  /**
   * 인증 코드로 토큰 교환
   */
  async exchangeCodeForToken(code: string): Promise<any> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2Client not initialized');
    }

    console.log('🔄 Exchanging authorization code for tokens...');
    const { tokens } = await this.oauth2Client.getToken(code);
    
    // refresh_token 포함 여부 확인 및 로깅
    console.log('📦 Received tokens from Google:');
    console.log('   access_token:', tokens.access_token ? `present (${tokens.access_token.length} chars)` : 'missing');
    console.log('   refresh_token:', tokens.refresh_token ? `present (${tokens.refresh_token.length} chars)` : '❌ MISSING');
    console.log('   id_token:', tokens.id_token ? `present (${tokens.id_token.length} chars)` : 'missing');
    console.log('   expiry_date:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'missing');
    console.log('   scope:', tokens.scope || 'missing');
    
    if (!tokens.refresh_token) {
      console.warn('⚠️ WARNING: refresh_token is missing in the response!');
      console.warn('   This may happen if the user has already granted access before.');
      console.warn('   The app will need to re-authenticate when the access token expires.');
    } else {
      console.log('✅ refresh_token is present - offline access is enabled');
    }
    
    this.oauth2Client.setCredentials(tokens);

    // 토큰 저장 (refresh_token 포함)
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

    // API 인스턴스 업데이트
    this.calendarApi = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.tasksApi = google.tasks({ version: 'v1', auth: this.oauth2Client });

    // 토큰 정보 반환 (Firebase 인증용)
    return tokens;
  }

  /**
   * 저장된 토큰 불러오기
   */
  async loadToken(): Promise<boolean> {
    if (!fs.existsSync(tokenPath)) {
      console.log('📭 No token file found at:', tokenPath);
      return false;
    }

    try {
      console.log('📂 Loading tokens from disk...');
      const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      
      // refresh_token 포함 여부 확인 및 로깅
      console.log('📦 Loaded tokens from disk:');
      console.log('   access_token:', tokens.access_token ? `present (${tokens.access_token.length} chars)` : 'missing');
      console.log('   refresh_token:', tokens.refresh_token ? `present (${tokens.refresh_token.length} chars)` : '❌ MISSING');
      console.log('   id_token:', tokens.id_token ? `present (${tokens.id_token.length} chars)` : 'missing');
      console.log('   expiry_date:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'missing');
      console.log('   scope:', tokens.scope || 'missing');
      
      if (!tokens.refresh_token) {
        console.warn('⚠️ WARNING: refresh_token is missing in saved tokens!');
        console.warn('   The app will need to re-authenticate when the access token expires.');
        console.warn('   This may happen if the user revoked access or the token was saved without refresh_token.');
      } else {
        console.log('✅ refresh_token is present - can refresh access token');
      }
      
      if (!this.oauth2Client) {
        console.log('🔄 OAuth2Client not initialized, initializing...');
        this.initializeGoogleOAuth();
      }

      if (!this.oauth2Client) {
        console.error('❌ Failed to initialize OAuth2Client');
        return false;
      }

      console.log('🔐 Setting credentials on OAuth2Client...');
      // refresh_token을 포함한 전체 토큰 객체를 설정
      // OAuth2Client는 자동으로 refresh_token을 인식하여 토큰 새로고침에 사용
      this.oauth2Client.setCredentials(tokens);
      console.log('✅ Credentials set successfully');
      console.log('   - access_token:', tokens.access_token ? 'set' : 'missing');
      console.log('   - refresh_token:', tokens.refresh_token ? 'set (can refresh)' : 'missing');
      console.log('   - id_token:', tokens.id_token ? 'set' : 'missing');

      // 토큰이 만료되었으면 새로고침
      if (this.oauth2Client.isTokenExpiring()) {
        console.log('🔄 Access token is expiring, refreshing...');
        
        if (!tokens.refresh_token) {
          console.error('❌ Cannot refresh token: refresh_token is missing!');
          console.error('   User needs to re-authenticate.');
          return false;
        }
        
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          console.log('✅ Access token refreshed successfully');
          
          // refresh_token 보존 (새로 받은 credentials에 refresh_token이 없을 수 있음)
          const updatedTokens = {
            ...credentials,
            refresh_token: credentials.refresh_token || tokens.refresh_token, // 기존 refresh_token 보존
          };
          
          this.oauth2Client.setCredentials(updatedTokens);
          fs.writeFileSync(tokenPath, JSON.stringify(updatedTokens, null, 2));
          console.log('💾 Updated tokens saved to disk (refresh_token preserved)');
        } catch (refreshError: any) {
          console.error('❌ Failed to refresh access token:', refreshError.message);
          console.error('   Error:', refreshError);
          return false;
        }
      } else {
        console.log('✅ Access token is still valid');
      }

      // API 인스턴스 업데이트 (Tasks API 제거됨)
      this.calendarApi = google.calendar({ version: 'v3', auth: this.oauth2Client });
      this.tasksApi = null; // Tasks API는 제거됨
      console.log('✅ API instances updated');

      return true;
    } catch (error: any) {
      console.error('❌ Failed to load token:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
      return false;
    }
  }

  /**
   * Google Calendar API 인스턴스 가져오기
   */
  getCalendarApi(): ReturnType<typeof google.calendar> {
    if (!this.calendarApi) {
      throw new Error('Calendar API not initialized. Please authenticate first.');
    }
    return this.calendarApi;
  }

  /**
   * Google Tasks API 인스턴스 가져오기
   */
  getTasksApi(): ReturnType<typeof google.tasks> {
    if (!this.tasksApi) {
      throw new Error('Tasks API not initialized. Please authenticate first.');
    }
    return this.tasksApi;
  }

  /**
   * 인증 상태 확인
   */
  isAuthenticated(): boolean {
    // Tasks API는 제거되었으므로 tasksApi 체크 제거
    return this.oauth2Client !== null && this.calendarApi !== null;
  }

  /**
   * 로그아웃 (완전 초기화)
   * 재로그인 시 첫 로그인과 동일한 깨끗한 환경을 제공하기 위해 모든 인증 관련 데이터를 삭제
   * Google 정책 권장: 서버에서도 토큰 무효화 요청
   */
  async logout(): Promise<void> {
    console.log('🚪 Starting complete logout and cleanup...');
    
    // 1. Google 서버에 토큰 무효화 요청 (정책 권장 사항)
    if (this.oauth2Client) {
      try {
        const currentCredentials = (this.oauth2Client as any).credentials;
        if (currentCredentials && currentCredentials.access_token) {
          console.log('🔄 Revoking token on Google server...');
          try {
            await this.oauth2Client.revokeCredentials();
            console.log('✅ Token revoked on Google server');
          } catch (revokeError: any) {
            // 토큰이 이미 만료되었거나 무효화되었을 수 있음 (정상적인 경우)
            console.warn('⚠️ Failed to revoke token on Google server:', revokeError.message);
            console.warn('   This is normal if the token is already expired or revoked');
          }
        } else {
          console.log('📭 No active token to revoke (already cleared)');
        }
      } catch (error: any) {
        console.warn('⚠️ Error during token revocation:', error.message);
        // 토큰 무효화 실패해도 로그아웃은 계속 진행
      }
    }
    
    // 2. 토큰 파일 완전 삭제
    if (fs.existsSync(tokenPath)) {
      try {
        fs.unlinkSync(tokenPath);
        console.log('✅ Token file deleted:', tokenPath);
      } catch (error: any) {
        console.error('❌ Failed to delete token file:', error.message);
        // 파일이 잠겨있을 수 있으므로 강제 삭제 시도
        try {
          fs.unlinkSync(tokenPath);
          console.log('✅ Token file deleted (retry successful)');
        } catch (retryError: any) {
          console.error('❌ Failed to delete token file after retry:', retryError.message);
        }
      }
    } else {
      console.log('📭 Token file does not exist (already deleted)');
    }
    
    // 3. OAuth2Client의 credentials 초기화 (메모리에서 토큰 제거)
    if (this.oauth2Client) {
      try {
        // OAuth2Client의 내부 credentials를 null로 설정
        this.oauth2Client.setCredentials({});
        console.log('✅ OAuth2Client credentials cleared');
      } catch (error: any) {
        console.warn('⚠️ Failed to clear OAuth2Client credentials:', error.message);
      }
    }
    
    // 4. 메모리 상태 완전 초기화
    this.oauth2Client = null;
    this.calendarApi = null;
    this.tasksApi = null;
    this.isReady = false;
    
    console.log('✅ All OAuth state cleared from memory:');
    console.log('   - oauth2Client: null');
    console.log('   - calendarApi: null');
    console.log('   - tasksApi: null');
    console.log('   - isReady: false');
    
    // 5. 재인증을 위해 OAuth2Client를 새로 초기화할 준비
    console.log('🔄 Ready for re-authentication with clean state');
    console.log('   Next authentication will use the same redirect URI: todadot://auth');
    console.log('✅ Logout completed - all authentication data cleared');
  }

  /**
   * 현재 저장된 토큰 가져오기 (Firebase 인증용)
   */
  getTokens(): any | null {
    if (!fs.existsSync(tokenPath)) {
      return null;
    }

    try {
      return JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
    } catch (error) {
      console.error('Failed to load tokens:', error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
const googleApiManager = new GoogleApiManager();

// 레거시 호환성을 위한 함수 export (클래스 메서드를 래핑)
export function initializeGoogleOAuth(): boolean {
  return googleApiManager.initializeGoogleOAuth();
}

export function isOAuthInitialized(): boolean {
  return googleApiManager.isOAuthInitialized();
}

export function setGoogleCredentials(clientId?: string, clientSecret?: string): boolean {
  return googleApiManager.setGoogleCredentials(clientId, clientSecret);
}

export function loadGoogleCredentials(): { clientId: string; clientSecret: string } | null {
  return googleApiManager.loadGoogleCredentials();
}

export function getAuthUrl(): string {
  return googleApiManager.getAuthUrl();
}

export async function exchangeCodeForToken(code: string): Promise<any> {
  return googleApiManager.exchangeCodeForToken(code);
}

export async function loadToken(): Promise<boolean> {
  return googleApiManager.loadToken();
}

export function getCalendarApi(): ReturnType<typeof google.calendar> {
  return googleApiManager.getCalendarApi();
}

export function getTasksApi(): ReturnType<typeof google.tasks> {
  return googleApiManager.getTasksApi();
}

export function isAuthenticated(): boolean {
  return googleApiManager.isAuthenticated();
}

export async function logout(): Promise<void> {
  await googleApiManager.logout();
}

export function getTokens(): any | null {
  return googleApiManager.getTokens();
}
