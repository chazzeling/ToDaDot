/**
 * Firebase 인증 훅
 * 웹: Firebase Authentication의 Google Provider 직접 사용
 * Electron: Google OAuth 토큰을 사용하여 Firebase에 로그인
 */
import { useState, useEffect, useCallback } from 'react';
import { 
  initializeFirebase, 
  signInWithGoogleToken,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
  getCurrentUser,
  onAuthChange,
  signOut as firebaseSignOut,
  FirebaseConfig
} from '../firebase/firebase';
import { isElectron } from '../utils/webAdapter';
import type { User } from 'firebase/auth';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase 초기화 및 인증 상태 확인
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { DEFAULT_FIREBASE_CONFIG } = await import('../firebase/firebase');
        let config: FirebaseConfig = DEFAULT_FIREBASE_CONFIG;
        
        // Electron 환경: 저장된 설정 불러오기
        if (isElectron() && window.electronAPI) {
          try {
            const configResult = await window.electronAPI.firebaseGetConfig();
            if (configResult.success && configResult.config) {
              config = configResult.config;
            }
          } catch (err) {
            console.warn('Failed to load Firebase config from Electron, using default:', err);
          }
        } else {
          // 웹 환경: 웹 어댑터에서 설정 가져오기
          try {
            const configResult = await window.electronAPI?.firebaseGetConfig();
            if (configResult?.success && configResult.config) {
              config = configResult.config;
            }
          } catch (err) {
            // 웹 어댑터가 없거나 실패하면 기본 설정 사용
          }
        }
        
        // Firebase 초기화
        await initializeFirebase(config);
        
        // 리디렉션 결과 확인 (웹과 Electron 모두)
        try {
          const redirectUser = await getGoogleRedirectResult();
          if (redirectUser) {
            setUser(redirectUser);
            setLoading(false);
            return;
          }
        } catch (err) {
          // 리디렉션 결과가 없으면 무시
        }
        
        // Electron 환경: 저장된 Google OAuth 토큰으로 Firebase 로그인 시도
        if (isElectron() && window.electronAPI) {
          try {
            const tokensResult = await window.electronAPI.firebaseGetGoogleTokens();
            if (tokensResult.success && tokensResult.tokens) {
              const { access_token, id_token } = tokensResult.tokens;
              if (access_token && id_token) {
                try {
                  const firebaseUser = await signInWithGoogleToken(access_token, id_token);
                  setUser(firebaseUser);
                } catch (err: any) {
                  // Firebase 인증 오류는 무시 (토큰이 만료되었거나 유효하지 않을 수 있음)
                  if (err?.code !== 'auth/invalid-credential') {
                    console.error('Failed to sign in with Google token:', err);
                  }
                }
              }
            }
          } catch (err) {
            console.warn('Failed to get Google tokens from Electron:', err);
          }
        }

        // 인증 상태 변경 리스너 설정
        const unsubscribe = onAuthChange((user) => {
          setUser(user);
          setLoading(false);
        });

        // 초기 로딩 완료
        if (!getCurrentUser()) {
          setLoading(false);
        }

        return () => {
          unsubscribe();
        };
      } catch (err: any) {
        console.error('Failed to initialize Firebase auth:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Google 로그인 (웹/Electron 모두 Firebase Authentication 사용)
  const signIn = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 웹과 Electron 모두 팝업 사용 (Electron에서 setWindowOpenHandler로 처리)
      const firebaseUser = await signInWithGooglePopup();
      setUser(firebaseUser);
      return { success: true, user: firebaseUser };
    } catch (err: any) {
      console.error('❌ Sign-in error:', err);
      // 리디렉션 에러는 무시 (페이지가 새로고침됨)
      if (err.message?.includes('리디렉션')) {
        return { success: true };
      }
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Google 리디렉션 로그인 (웹용)
  const signInWithRedirect = useCallback(async () => {
    if (isElectron()) {
      throw new Error('Redirect sign-in is only available in web environment');
    }
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogleRedirect();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await firebaseSignOut();
      setUser(null);
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signInWithRedirect,
    signOut,
    isAuthenticated: user !== null,
    uid: user?.uid || null,
  };
}

