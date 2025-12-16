// Firebase 설정
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

/**
 * Firebase 설정 불러오기
 * 사용자가 GoogleApiSettings에서 설정한 Firebase 정보를 불러옵니다
 */
import { app } from 'electron';
import path from 'node:path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const userDataPath = app.getPath('userData');
const firebaseConfigPath = path.join(userDataPath, 'firebase-config.json');

export function loadFirebaseConfig(): FirebaseConfig | null {
  // 먼저 저장된 설정 확인
  if (fs.existsSync(firebaseConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      return config;
    } catch (error) {
      console.error('Failed to load Firebase config:', error);
    }
  }
  
  // 저장된 설정이 없으면 기본 설정 사용
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  fs.writeFileSync(firebaseConfigPath, JSON.stringify(config, null, 2));
}

export function getFirebaseConfigPath(): string {
  return firebaseConfigPath;
}

