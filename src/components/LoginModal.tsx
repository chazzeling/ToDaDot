/**
 * 로그인 모달 컴포넌트
 * 웹: Firebase Authentication 팝업 사용
 * Electron: Google OAuth 플로우 사용
 */
import { useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import { isElectron } from '../utils/webAdapter';
import { X } from 'lucide-react';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signIn, signInWithRedirect, loading, error } = useFirebaseAuth();
  const [authCode, setAuthCode] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Electron 환경: Google OAuth URL 가져오기
  const handleGetAuthUrl = async () => {
    if (!isElectron() || !window.electronAPI) {
      return;
    }

    try {
      const result = await window.electronAPI.googleGetAuthUrl();
      if (result.success && result.url) {
        setAuthUrl(result.url);
        // 외부 브라우저에서 열기
        window.open(result.url, '_blank');
      } else {
        alert(result.error || '인증 URL을 가져올 수 없습니다.');
      }
    } catch (err: any) {
      alert(err.message || '오류가 발생했습니다.');
    }
  };

  // Electron 환경: 인증 코드로 토큰 교환 및 Firebase 로그인
  const handleExchangeCode = async () => {
    if (!isElectron() || !window.electronAPI) {
      return;
    }

    if (!authCode.trim()) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    try {
      // Google OAuth 토큰 교환
      console.log('🔄 Exchanging authorization code for tokens...');
      const result = await window.electronAPI.googleExchangeCode(authCode.trim());
      if (result.success) {
        console.log('✅ Token exchange successful');
        // Google OAuth 토큰 가져오기
        console.log('📥 Getting Google tokens for Firebase...');
        const tokensResult = await window.electronAPI.firebaseGetGoogleTokens();
        if (tokensResult.success && tokensResult.tokens) {
          const { access_token, id_token } = tokensResult.tokens;
          console.log('📦 Tokens received:', {
            hasAccessToken: !!access_token,
            hasIdToken: !!id_token,
            accessTokenLength: access_token?.length || 0,
            idTokenLength: id_token?.length || 0,
          });
          
          if (id_token) {
            // Firebase 로그인 (id_token만 있어도 가능)
            console.log('🔐 Signing in to Firebase...');
            const signInResult = await signIn(access_token || undefined, id_token);
            if (signInResult.success) {
              console.log('✅ Firebase sign-in successful');
              onClose();
            } else {
              console.error('❌ Firebase sign-in failed:', signInResult.error);
              alert(signInResult.error || '로그인에 실패했습니다.');
            }
          } else {
            alert('id_token을 가져올 수 없습니다. 다시 시도해주세요.');
          }
        } else {
          console.error('❌ Failed to get Google tokens:', tokensResult.error);
          alert(tokensResult.error || 'Google 토큰을 가져올 수 없습니다.');
        }
      } else {
        console.error('❌ Token exchange failed:', result.error);
        alert(result.error || '인증 코드 교환에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('❌ Login error:', err);
      alert(err.message || '오류가 발생했습니다.');
    }
  };

  // Firebase Authentication 로그인 (웹: 팝업, Electron: 리디렉션)
  const handleWebSignIn = async () => {
    try {
      const result = await signIn();
      if (result.success) {
        // Electron 리디렉션의 경우 페이지가 새로고침되므로 모달을 닫을 필요 없음
        if (!isElectron()) {
          onClose();
        }
      } else {
        alert(result.error || '로그인에 실패했습니다.');
      }
    } catch (err: any) {
      // 리디렉션 에러는 무시 (페이지가 새로고침됨)
      if (!err.message?.includes('리디렉션')) {
        alert(err.message || '오류가 발생했습니다.');
      }
    }
  };

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <div className="login-modal-header">
          <h2>Google 로그인</h2>
          <button className="login-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="login-modal-content">
          <div className="web-login-flow">
            <p>Google 계정으로 로그인하여 데이터를 동기화하세요.</p>
            <button
              className="login-btn primary"
              onClick={handleWebSignIn}
              disabled={loading}
            >
              {loading ? '로그인 중...' : 'Google로 로그인'}
            </button>
            {isElectron() && (
              <p className="help-text" style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                팝업이 차단된 경우 브라우저 설정에서 팝업을 허용해주세요.
              </p>
            )}
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

