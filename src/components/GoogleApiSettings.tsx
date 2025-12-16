import { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import './GoogleApiSettings.css';
import { initializeFirebase, signInWithGoogleToken } from '../firebase/firebase';

interface GoogleApiSettingsProps {
  onClose: () => void;
}

export default function GoogleApiSettings({ onClose }: GoogleApiSettingsProps) {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isOAuthReady, setIsOAuthReady] = useState(false); // OAuth 초기화 완료 상태
  
  // Firebase 설정 상태
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState('');
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState('');
  const [firebaseAppId, setFirebaseAppId] = useState('');

  useEffect(() => {
    // 웹 환경 감지 (isElectron 함수 사용)
    import('../utils/webAdapter').then(({ isElectron }) => {
      if (!isElectron()) {
        console.log('🌐 Web environment: Skipping OAuth initialization');
        setIsOAuthReady(false);
        setLoading(false);
        return;
      }
      
      // Electron 환경에서만 OAuth 초기화 상태 확인 및 인증 상태 확인
      checkOAuthReady();
      checkAuthStatus();
    });
    
    // Firebase 설정 불러오기
    loadFirebaseConfig();
    
    // OAuth 리다이렉트 이벤트 리스너 등록
    if (window.electronAPI) {
      // OAuth 코드 수신 시 자동으로 토큰 교환
      window.electronAPI.onOAuthCodeReceived?.((code: string) => {
        console.log('📥 OAuth code received via Custom Protocol:', code.substring(0, 20) + '...');
        setAuthCode(code);
        // 자동으로 토큰 교환 실행
        setTimeout(() => {
          handleExchangeCodeWithCode(code);
        }, 500);
      });
      
      // OAuth 에러 수신 시 표시
      window.electronAPI.onOAuthError?.((error: { error: string; errorDescription: string }) => {
        console.error('❌ OAuth error received:', error);
        setError(`OAuth 인증 실패: ${error.errorDescription || error.error}`);
      });
    }
    
    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (window.electronAPI?.removeOAuthListeners) {
        window.electronAPI.removeOAuthListeners();
      }
    };
  }, []);

  const checkOAuthReady = async () => {
    // 웹 환경 감지
    const { isElectron } = await import('../utils/webAdapter');
    if (!isElectron()) {
      console.log('🌐 Web environment detected: OAuth not available');
      setIsOAuthReady(false);
      setLoading(false);
      return;
    }
    
    // OAuth 초기화가 완료되었는지 확인
    console.log('🔍 [React] Checking OAuth ready status...');
    console.log('🔍 [React] window.electronAPI:', window.electronAPI ? 'exists' : 'null');
    console.log('🔍 [React] window.electronAPI?.googleIsOAuthReady:', typeof window.electronAPI?.googleIsOAuthReady);
    
    try {
      // 런타임 체크: googleIsOAuthReady 메서드가 있는지 확인
      const hasOAuthReadyAPI = window.electronAPI && typeof window.electronAPI.googleIsOAuthReady === 'function';
      
      if (hasOAuthReadyAPI) {
        console.log('📡 [React] Calling googleIsOAuthReady IPC...');
        const ready = await window.electronAPI.googleIsOAuthReady();
        console.log('📡 [React] IPC response:', ready);
        setIsOAuthReady(ready);
        if (ready) {
          console.log('✅ [React] OAuth is ready!');
        } else {
          console.warn('⚠️ [React] OAuth is not ready yet');
        }
      } else {
        console.warn('⚠️ [React] googleIsOAuthReady API not available, trying legacy method...');
        console.warn('   Available methods:', Object.keys(window.electronAPI || {}));
        
        // 레거시 호환성: 인증 URL 생성 시도
        if (window.electronAPI?.googleGetAuthUrl) {
          try {
            const result = await window.electronAPI.googleGetAuthUrl();
            const ready = result?.success || false;
            console.log('📡 [React] Legacy method result:', ready);
            setIsOAuthReady(ready);
          } catch (legacyErr: any) {
            console.error('❌ [React] Legacy method failed:', legacyErr);
            setIsOAuthReady(false);
          }
        } else {
          console.error('❌ [React] No OAuth check method available');
          setIsOAuthReady(false);
        }
      }
    } catch (err: any) {
      console.error('❌ [React] OAuth 초기화 확인 실패:', err);
      console.error('   Error type:', err?.constructor?.name);
      console.error('   Error message:', err?.message);
      console.error('   Error stack:', err?.stack);
      setIsOAuthReady(false);
      // 초기화 실패는 에러로 표시하지 않고, 버튼만 비활성화
    } finally {
      setLoading(false);
    }
  };

  const loadFirebaseConfig = async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.firebaseGetConfig();
      if (result.success && result.config) {
        setFirebaseApiKey(result.config.apiKey || '');
        setFirebaseAuthDomain(result.config.authDomain || '');
        setFirebaseProjectId(result.config.projectId || '');
        setFirebaseStorageBucket(result.config.storageBucket || '');
        setFirebaseMessagingSenderId(result.config.messagingSenderId || '');
        setFirebaseAppId(result.config.appId || '');
      }
    }
  };

  const checkAuthStatus = async () => {
    if (window.electronAPI) {
      const authenticated = await window.electronAPI.googleIsAuthenticated();
      setIsAuthenticated(authenticated);
    }
  };

  const handleSetCredentials = async () => {
    console.log('🔵 [React] handleSetCredentials called');
    console.log('   clientSecret length:', clientSecret.trim().length);
    
    if (!clientSecret.trim()) {
      console.error('❌ [React] Client Secret is empty');
      setError('클라이언트 시크릿을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI) {
        console.error('❌ [React] window.electronAPI is not available');
        setError('Electron API를 사용할 수 없습니다. 앱을 재시작해주세요.');
        return;
      }

      if (!window.electronAPI.googleSetCredentials) {
        console.error('❌ [React] googleSetCredentials is not available');
        setError('Google API를 사용할 수 없습니다. 앱을 재시작해주세요.');
        return;
      }

      console.log('📡 [React] Calling googleSetCredentials IPC...');
      // Client ID는 하드코딩된 값 사용
      const defaultClientId = '220403143188-7ip0cu2ct0sr37hdh1his9kdbo930v5e.apps.googleusercontent.com';
      const result = await window.electronAPI.googleSetCredentials(defaultClientId, clientSecret.trim());
      console.log('📡 [React] IPC response:', JSON.stringify(result, null, 2));
      console.log('📡 [React] IPC response.success:', result?.success);
      console.log('📡 [React] IPC response.error:', result?.error);
      
      if (result.success) {
        console.log('✅ [React] Credentials saved and OAuth initialized successfully');
        setSuccess('인증 정보가 저장되었습니다. OAuth 초기화 중...');
        // OAuth 초기화 상태 재확인
        await checkOAuthReady();
        if (isOAuthReady) {
          setSuccess('인증 정보가 저장되었습니다. 이제 인증 URL을 생성할 수 있습니다.');
        } else {
          console.warn('⚠️ [React] OAuth initialization check returned false after credentials save');
          setError('인증 정보는 저장되었지만 OAuth 초기화에 실패했습니다. Main 프로세스 로그를 확인하세요.');
        }
      } else {
        console.error('❌ [React] Failed to save credentials or initialize OAuth:', result.error);
        setError(result.error || '인증 정보 저장에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('❌ [React] Exception in handleSetCredentials:', err);
      console.error('   Error message:', err.message);
      console.error('   Error stack:', err.stack);
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetAuthUrl = async () => {
    // OAuth 초기화 상태 재확인
    if (!isOAuthReady) {
      await checkOAuthReady();
      if (!isOAuthReady) {
        setError('OAuth가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.googleGetAuthUrl();
        if (result.success && result.url) {
          setAuthUrl(result.url);
          setSuccess('인증 URL이 생성되었습니다. 브라우저에서 열어주세요.');
          // 브라우저에서 자동으로 열기
          window.open(result.url, '_blank');
        } else {
          setError(result.error || '인증 URL 생성에 실패했습니다.');
          // 실패 시 OAuth 상태 재확인
          setIsOAuthReady(false);
        }
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
      setIsOAuthReady(false);
    } finally {
      setLoading(false);
    }
  };

  // 토큰 교환 공통 로직 (수동 입력 및 Custom Protocol 모두 사용)
  const handleExchangeCodeWithCode = async (code: string) => {
    if (!code.trim()) {
      setError('인증 코드를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (window.electronAPI) {
        // Google OAuth 토큰 교환
        const result = await window.electronAPI.googleExchangeCode(code.trim());
        if (result.success) {
          // Firebase 설정은 하드코딩되어 있으므로 기본 설정 사용
          const { DEFAULT_FIREBASE_CONFIG } = await import('../firebase/firebase');
          
          // Firebase 초기화 및 Google 토큰으로 로그인
          await initializeFirebase(DEFAULT_FIREBASE_CONFIG);
          
          // Google OAuth 토큰 가져오기
          const tokensResult = await window.electronAPI.firebaseGetGoogleTokens();
          if (tokensResult.success && tokensResult.tokens) {
            const { access_token, id_token } = tokensResult.tokens;
            if (access_token && id_token) {
              await signInWithGoogleToken(access_token, id_token);
            }
          }
          
          setSuccess('인증이 완료되었습니다!');
          setIsAuthenticated(true);
          setAuthCode('');
          setAuthUrl(null);
        } else {
          setError(result.error || '인증 코드 교환에 실패했습니다.');
        }
      }
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async () => {
    await handleExchangeCodeWithCode(authCode);
  };

  const handleLogout = async () => {
    if (window.electronAPI) {
      await window.electronAPI.googleLogout();
      setIsAuthenticated(false);
      setAuthUrl(null);
      setAuthCode('');
      setSuccess('로그아웃되었습니다.');
    }
  };

  return (
    <div className="google-api-settings-overlay" onClick={onClose}>
      <div className="google-api-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="google-api-settings-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="var(--text-primary)" />
            Google API 설정
          </h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="google-api-settings-content">
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              {success}
            </div>
          )}

          {isAuthenticated ? (
            <div className="auth-status">
              <div className="status-badge authenticated">✓ 인증됨</div>
              <p>Google Calendar와 Google Tasks API를 사용할 수 있습니다.</p>
              <button className="btn btn-danger" onClick={handleLogout} disabled={loading}>
                로그아웃
              </button>
            </div>
          ) : (
            <>
              <div className="settings-section">
                <h3>1단계: Firebase 설정 (선택사항)</h3>
                <p className="help-text">
                  Firebase Console에서 발급받은 설정 정보를 입력하세요. 일기/메모 동기화 기능을 사용하려면 필요합니다.
                  <br />
                  <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                    Firebase Console 열기
                  </a>
                </p>
                
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="text"
                    value={firebaseApiKey}
                    onChange={(e) => setFirebaseApiKey(e.target.value)}
                    placeholder="Firebase API Key"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Auth Domain</label>
                  <input
                    type="text"
                    value={firebaseAuthDomain}
                    onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                    placeholder="project-id.firebaseapp.com"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Project ID</label>
                  <input
                    type="text"
                    value={firebaseProjectId}
                    onChange={(e) => setFirebaseProjectId(e.target.value)}
                    placeholder="project-id"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Storage Bucket</label>
                  <input
                    type="text"
                    value={firebaseStorageBucket}
                    onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                    placeholder="project-id.appspot.com"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>Messaging Sender ID</label>
                  <input
                    type="text"
                    value={firebaseMessagingSenderId}
                    onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                    placeholder="123456789"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                
                <div className="form-group">
                  <label>App ID</label>
                  <input
                    type="text"
                    value={firebaseAppId}
                    onChange={(e) => setFirebaseAppId(e.target.value)}
                    placeholder="1:123456789:web:abcdef"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h3>2단계: Google API 인증</h3>
                <p className="help-text">
                  Google OAuth Client ID는 이미 설정되어 있습니다. (하드코딩됨)
                  <br />
                  Client Secret을 아래 입력란에 직접 입력해주세요.
                  <br />
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                    Google Cloud Console 열기
                  </a>
                </p>
                
                <div className="form-group">
                  <label>클라이언트 ID (자동 설정됨)</label>
                  <input
                    type="text"
                    value="220403143188-7ip0cu2ct0sr37hdh1his9kdbo930v5e.apps.googleusercontent.com"
                    readOnly
                    className="form-input"
                    disabled
                    style={{ opacity: 0.7 }}
                  />
                </div>

                <div className="form-group">
                  <label>클라이언트 시크릿</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Client Secret을 입력하세요"
                    className="form-input"
                  />
                  <p className="help-text" style={{ marginTop: '5px', fontSize: '12px' }}>
                    Google Cloud Console에서 Client Secret을 복사하여 입력하세요.
                  </p>
                </div>
                
                <button
                  onClick={handleSetCredentials}
                  disabled={loading || !clientSecret.trim()}
                  className="btn-primary"
                  style={{ marginTop: '10px' }}
                >
                  {loading ? '저장 중...' : '인증 정보 저장'}
                </button>
              </div>

              <div className="settings-section">
                <h3>2단계: 인증 URL 생성</h3>
                <p className="help-text">
                  인증 정보를 저장한 후, 인증 URL을 생성하여 브라우저에서 열어주세요.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleGetAuthUrl}
                  disabled={loading || !isOAuthReady}
                >
                  {loading ? '처리 중...' : isOAuthReady ? '인증 URL 생성 및 열기' : 'OAuth 초기화 중...'}
                </button>
                {!isOAuthReady && !loading && (
                  <p className="help-text" style={{ marginTop: '10px', color: '#ff9800' }}>
                    OAuth 초기화 중입니다. 잠시만 기다려주세요...
                  </p>
                )}
                {authUrl && (
                  <div className="auth-url-display">
                    <p>인증 URL:</p>
                    <input
                      type="text"
                      value={authUrl}
                      readOnly
                      className="form-input"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h3>3단계: 인증 코드 입력</h3>
                <p className="help-text">
                  브라우저에서 권한을 승인하면 인증 코드가 표시됩니다. 해당 코드를 입력하세요.
                </p>
                <div className="form-group">
                  <label>인증 코드</label>
                  <input
                    type="text"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    placeholder="인증 코드를 입력하세요"
                    className="form-input"
                    disabled={loading}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleExchangeCode}
                  disabled={loading || !authCode.trim()}
                >
                  인증 완료
                </button>
              </div>
            </>
          )}

          <div className="settings-section">
            <h3>도움말</h3>
            <p className="help-text">
              Google API 설정 방법은 <code>GOOGLE_API_SETUP.md</code> 파일을 참고하세요.
            </p>
          </div>
        </div>

        <div className="google-api-settings-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}



