import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 데이터베이스 파일 경로 설정
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'todadot.db');

let db: Database.Database | null = null;

/**
 * 데이터베이스 초기화
 */
export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  // 데이터베이스 파일이 없으면 생성
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  db = new Database(dbPath);

  // 메모 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY,
      todo_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 이미지 경로 테이블 생성 (헤더 배너)
  db.exec(`
    CREATE TABLE IF NOT EXISTS header_images (
      id TEXT PRIMARY KEY,
      image_path TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 달력 스티커 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_stickers (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      image_path TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      is_locked INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 스티커 레이아웃 테이블 생성
  db.exec(`
    CREATE TABLE IF NOT EXISTS sticker_layouts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      resolution_width INTEGER NOT NULL,
      resolution_height INTEGER NOT NULL,
      stickers_data TEXT NOT NULL,
      saved_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // 인덱스 생성
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memos_todo_id ON memos(todo_id);
    CREATE INDEX IF NOT EXISTS idx_stickers_date ON calendar_stickers(date);
    CREATE INDEX IF NOT EXISTS idx_layouts_saved_at ON sticker_layouts(saved_at);
  `);

  console.log('Database initialized at:', dbPath);
  return db;
}

/**
 * 데이터베이스 인스턴스 가져오기
 */
export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * 앱 종료 시 데이터베이스 연결 종료
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 스티커 레이아웃 저장
 */
export function dbSaveStickerLayout(
  id: string,
  name: string,
  resolutionWidth: number,
  resolutionHeight: number,
  stickersData: string,
  savedAt: number
): void {
  const database = getDatabase();
  const now = Date.now();
  
  database.prepare(`
    INSERT OR REPLACE INTO sticker_layouts (
      id, name, resolution_width, resolution_height, stickers_data, saved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, resolutionWidth, resolutionHeight, stickersData, savedAt, now, now);
}

/**
 * 모든 스티커 레이아웃 불러오기
 */
export function dbGetAllStickerLayouts(): any[] {
  const database = getDatabase();
  return database.prepare('SELECT * FROM sticker_layouts ORDER BY saved_at DESC').all();
}

/**
 * 스티커 레이아웃 불러오기 (ID로)
 */
export function dbGetStickerLayout(id: string): any | null {
  const database = getDatabase();
  return database.prepare('SELECT * FROM sticker_layouts WHERE id = ?').get(id) || null;
}

/**
 * 스티커 레이아웃 삭제
 */
export function dbDeleteStickerLayout(id: string): void {
  const database = getDatabase();
  database.prepare('DELETE FROM sticker_layouts WHERE id = ?').run(id);
}

/**
 * 모든 데이터베이스 데이터 초기화 (exe 패키징 전 초기화용)
 * 
 * ⚠️ 주의: 이 함수는 사용자 데이터(메모, 헤더 이미지, 스티커, 레이아웃)만 삭제합니다.
 * Google OAuth 토큰 파일(google-token.json)과 Firebase 토큰 파일(firebase-token.json)은
 * 파일 시스템에 별도로 저장되므로 이 함수에서는 삭제되지 않습니다.
 * Keytar를 사용하지 않으므로 OS 보안 저장소 관련 작업은 없습니다.
 */
export function clearAllDatabaseData(): void {
  const database = getDatabase();
  
  try {
    // 사용자 데이터 테이블의 데이터만 삭제
    // ⚠️ Google OAuth 토큰은 파일 시스템(google-token.json)에 저장되므로 여기서 삭제되지 않습니다.
    database.prepare('DELETE FROM memos').run();
    database.prepare('DELETE FROM header_images').run();
    database.prepare('DELETE FROM calendar_stickers').run();
    database.prepare('DELETE FROM sticker_layouts').run();
    
    console.log('✅ All user database data cleared!');
    console.log('⚠️ Note: Google OAuth tokens (google-token.json) are preserved.');
  } catch (error) {
    console.error('❌ Failed to clear database data:', error);
    throw error;
  }
}

