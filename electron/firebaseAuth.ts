/**
 * Firebase Authentication 및 Firestore 관리 모듈
 * Google Sign-In과 통합하여 단일 로그인으로 모든 서비스 사용
 */
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { OAuth2Client } from 'google-auth-library';
import { loadFirebaseConfig, saveFirebaseConfig, FirebaseConfig } from './firebaseConfig.js';
import { app } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseApp: App | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let currentUserId: string | null = null;

const userDataPath = app.getPath('userData');
const firebaseTokenPath = path.join(userDataPath, 'firebase-token.json');

// Firebase Admin SDK 초기화
export async function initializeFirebase(config: FirebaseConfig): Promise<void> {
  try {
    // 이미 초기화되어 있으면 재사용
    if (firebaseApp) {
      return;
    }

    // Firebase Admin SDK는 서비스 계정 키가 필요하지만,
    // 클라이언트 측 Firebase SDK를 사용하여 인증하는 방식으로 변경
    // 대신 클라이언트 측에서 ID 토큰을 받아서 Node.js에서 검증하는 방식 사용
    saveFirebaseConfig(config);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Google OAuth 토큰으로 Firebase 인증
 * Google OAuth2 토큰을 사용하여 Firebase Custom Token 생성
 */
export async function authenticateWithGoogleToken(
  oauth2Client: OAuth2Client,
  googleTokens: any
): Promise<string> {
  try {
    // Google OAuth 토큰에서 ID 토큰 추출
    const idToken = googleTokens.id_token;
    
    if (!idToken) {
      throw new Error('No ID token found in Google OAuth tokens');
    }

    // Firebase Admin SDK를 사용하여 ID 토큰 검증 및 UID 획득
    // 하지만 Firebase Admin SDK 초기화가 필요하므로,
    // 대신 클라이언트 측에서 Firebase Auth를 사용하는 방식으로 변경

    // 임시: OAuth 토큰의 사용자 정보를 사용하여 UID 생성
    // 실제로는 Firebase Admin SDK의 verifyIdToken을 사용해야 함
    const ticket = await oauth2Client.verifyIdToken({
      idToken: idToken,
      audience: oauth2Client._clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    const uid = payload.sub; // Google 사용자 ID를 Firebase UID로 사용
    currentUserId = uid;

    // 토큰 저장
    saveAuthState({ uid, idToken, accessToken: googleTokens.access_token });

    return uid;
  } catch (error) {
    console.error('Failed to authenticate with Google token:', error);
    throw error;
  }
}

/**
 * 저장된 인증 상태 불러오기
 */
interface AuthState {
  uid: string;
  idToken: string;
  accessToken: string;
}

export function loadAuthState(): AuthState | null {
  if (!fs.existsSync(firebaseTokenPath)) {
    return null;
  }

  try {
    const state = JSON.parse(fs.readFileSync(firebaseTokenPath, 'utf-8'));
    currentUserId = state.uid;
    return state;
  } catch (error) {
    console.error('Failed to load auth state:', error);
    return null;
  }
}

export function saveAuthState(state: AuthState): void {
  fs.writeFileSync(firebaseTokenPath, JSON.stringify(state, null, 2));
  currentUserId = state.uid;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export function clearAuthState(): void {
  if (fs.existsSync(firebaseTokenPath)) {
    fs.unlinkSync(firebaseTokenPath);
  }
  currentUserId = null;
}

/**
 * Firebase Admin SDK 초기화 (서비스 계정 키 필요)
 * 이 방법은 서비스 계정 키 파일이 필요하므로,
 * 대신 클라이언트 측 Firebase SDK + ID 토큰 검증 방식 사용
 */
export async function initializeFirebaseAdmin(serviceAccountPath?: string): Promise<void> {
  // 이 함수는 나중에 서비스 계정 방식이 필요할 때 구현
  // 현재는 클라이언트 측 인증 + ID 토큰 검증 방식 사용
}

/**
 * Firestore 인스턴스 가져오기 (클라이언트 측 사용)
 * 실제 Firestore 작업은 클라이언트 측 Firebase SDK를 사용
 */
export function getFirestoreInstance(): Firestore | null {
  return firestore;
}









