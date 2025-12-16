/**
 * 빌드 전 데이터 초기화 스크립트
 * localStorage와 SQLite 데이터베이스를 초기화합니다.
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 빌드 전 데이터 초기화 시작...');

// SQLite 데이터베이스 파일 경로
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' 
    ? path.join(process.env.HOME, 'Library', 'Application Support')
    : path.join(process.env.HOME, '.config'));
const appDataPath = path.join(userDataPath, 'ToDaDot');
const dbPath = path.join(appDataPath, 'todadot.db');

// 데이터베이스 파일 삭제
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    console.log('✅ SQLite 데이터베이스 파일 삭제됨:', dbPath);
  } catch (error) {
    console.error('❌ 데이터베이스 파일 삭제 실패:', error);
  }
} else {
  console.log('ℹ️ 데이터베이스 파일이 없습니다 (정상)');
}

// Google OAuth 토큰 파일 삭제
const googleTokenPath = path.join(appDataPath, 'google-token.json');
if (fs.existsSync(googleTokenPath)) {
  try {
    fs.unlinkSync(googleTokenPath);
    console.log('✅ Google OAuth 토큰 파일 삭제됨');
  } catch (error) {
    console.error('❌ Google OAuth 토큰 파일 삭제 실패:', error);
  }
}

// Firebase 토큰 파일 삭제
const firebaseTokenPath = path.join(appDataPath, 'firebase-token.json');
if (fs.existsSync(firebaseTokenPath)) {
  try {
    fs.unlinkSync(firebaseTokenPath);
    console.log('✅ Firebase 토큰 파일 삭제됨');
  } catch (error) {
    console.error('❌ Firebase 토큰 파일 삭제 실패:', error);
  }
}

// 스티커 이미지 폴더 삭제
const stickersPath = path.join(appDataPath, 'stickers');
if (fs.existsSync(stickersPath)) {
  try {
    fs.rmSync(stickersPath, { recursive: true, force: true });
    console.log('✅ 스티커 이미지 폴더 삭제됨');
  } catch (error) {
    console.error('❌ 스티커 이미지 폴더 삭제 실패:', error);
  }
}

console.log('✅ 빌드 전 데이터 초기화 완료!');
console.log('⚠️ 참고: 이 스크립트는 개발 환경의 사용자 데이터를 초기화합니다.');
console.log('   프로덕션 빌드에는 사용자 데이터가 포함되지 않습니다.');

