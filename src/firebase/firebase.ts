/**
 * Firebase 클라이언트 SDK 설정
 * React 렌더러 프로세스에서 사용
 */
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  GoogleAuthProvider, 
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  User,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Firebase 설정 상수 (하드코딩)
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyDhb0CoeK-ml-bw1009trKPIPTkvisqcew",
  authDomain: "todadot-897fd.firebaseapp.com",
  projectId: "todadot-897fd",
  storageBucket: "todadot-897fd.firebasestorage.app",
  messagingSenderId: "266528226526",
  appId: "1:266528226526:web:16199d2315b7fed705d64f",
  measurementId: "G-MJ6HJK62YE",
};

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

/**
 * Firebase 초기화
 */
export async function initializeFirebase(config: FirebaseConfig): Promise<void> {
  try {
    // 이미 초기화되어 있으면 재사용
    if (getApps().length > 0) {
      firebaseApp = getApps()[0];
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
      return;
    }

    // Electron 환경에서 file:// 프로토콜 사용 시 origin 확인
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      console.log('🌐 Current origin:', currentOrigin);
      console.log('🌐 Current href:', window.location.href);
      
      // file:// 프로토콜을 사용하는 경우 localhost로 처리
      if (currentOrigin === 'null' || currentOrigin.startsWith('file://')) {
        console.log('⚠️ Electron file:// protocol detected, Firebase will use localhost origin');
        // Firebase는 내부적으로 origin을 확인하므로, 
        // webSecurity: false 설정과 함께 localhost가 허용된 도메인에 있어야 함
      }
    }

    firebaseApp = initializeApp(config);
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Google OAuth 토큰으로 Firebase 인증 (Electron용)
 */
export async function signInWithGoogleToken(accessToken: string, idToken: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  console.log('🔐 Attempting Firebase sign-in with Google tokens...');
  console.log('   idToken length:', idToken?.length || 0);
  console.log('   accessToken length:', accessToken?.length || 0);
  
  try {
    // idToken만 사용 (Firebase는 idToken만으로도 인증 가능)
    // accessToken은 선택적이지만 제공하면 더 좋음
    let credential;
    if (idToken && accessToken) {
      credential = GoogleAuthProvider.credential(idToken, accessToken);
    } else if (idToken) {
      credential = GoogleAuthProvider.credential(idToken);
    } else {
      throw new Error('idToken is required for Firebase authentication');
    }
    
    console.log('   Credential created, signing in...');
    const result = await signInWithCredential(auth, credential);
    console.log('✅ Firebase sign-in successful:', result.user.uid);
    return result.user;
  } catch (error: any) {
    console.error('❌ Firebase sign-in failed:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error details:', error);
    
    // 더 자세한 에러 정보 제공
    if (error.code === 'auth/internal-error') {
      throw new Error(`Firebase 인증 오류: ${error.message || '내부 오류가 발생했습니다. idToken과 accessToken을 확인해주세요.'}`);
    }
    throw error;
  }
}

/**
 * Google 팝업 로그인 (웹/Electron용)
 */
export async function signInWithGooglePopup(): Promise<User> {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  // Electron 환경에서 origin 확인
  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin;
    console.log('🔐 Current origin for sign-in:', currentOrigin);
    if (currentOrigin === 'null' || currentOrigin.startsWith('file://')) {
      console.log('⚠️ Electron file:// protocol detected');
      console.log('   Make sure "localhost" is added to Firebase authorized domains');
    }
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  // 항상 계정 선택 화면을 표시하도록 설정 (자동 로그인 방지)
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  
  console.log('🔐 Starting Firebase popup sign-in...');
  
  try {
    const result = await signInWithPopup(auth, provider);
    console.log('✅ Firebase popup sign-in successful');
    return result.user;
  } catch (error: any) {
    console.error('❌ Firebase popup sign-in error:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    // unauthorized-domain 오류인 경우 더 자세한 정보 제공
    if (error.code === 'auth/unauthorized-domain') {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown';
      console.error('   Current origin:', currentOrigin);
      console.error('   Please add "localhost" to Firebase authorized domains');
      throw new Error(`Firebase 인증 도메인 오류: ${currentOrigin}이 허용된 도메인에 없습니다. Firebase Console에서 "localhost"를 추가해주세요.`);
    }
    
    // 팝업이 차단되었거나 Electron에서 작동하지 않는 경우 리디렉션으로 폴백
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/internal-error') {
      console.log('🔄 Popup failed, trying redirect method...');
      await signInWithGoogleRedirect();
      // 리디렉션은 페이지를 이동시키므로 여기서는 에러를 던짐
      throw new Error('리디렉션 방식으로 로그인을 시도했습니다. 페이지가 새로고침됩니다.');
    }
    throw error;
  }
}

/**
 * Google 리디렉션 로그인 (웹용)
 */
export async function signInWithGoogleRedirect(): Promise<void> {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  
  await signInWithRedirect(auth, provider);
}

/**
 * 리디렉션 결과 가져오기 (웹용)
 */
export async function getGoogleRedirectResult(): Promise<User | null> {
  if (!auth) {
    throw new Error('Firebase not initialized');
  }

  const result = await getRedirectResult(auth);
  return result?.user || null;
}

/**
 * 현재 사용자 가져오기
 */
export function getCurrentUser(): User | null {
  if (!auth) {
    return null;
  }
  return auth.currentUser;
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  if (!auth) {
    return;
  }
  await firebaseSignOut(auth);
}

/**
 * Firestore 인스턴스 가져오기
 */
export function getFirestoreInstance(): Firestore | null {
  return firestore;
}

/**
 * 일기/메모 Firestore 경로 헬퍼
 */
export function getDiariesCollectionPath(uid: string): string {
  return `users/${uid}/diaries`;
}

export function getMemosCollectionPath(uid: string): string {
  return `users/${uid}/memos`;
}

/**
 * 투두 Firestore 경로 헬퍼
 */
export function getTodosCollectionPath(uid: string): string {
  return `users/${uid}/todos`;
}

