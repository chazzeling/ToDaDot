# 데이터 저장 위치 및 동기화 가이드

## 📍 데이터 저장 위치

### 웹 버전
- **위치**: 브라우저의 `localStorage`
- **경로**: 
  - Chrome/Edge: `%LocalAppData%\Google\Chrome\User Data\Default\Local Storage\leveldb` (Windows)
  - Firefox: `%AppData%\Mozilla\Firefox\Profiles\[프로필]\storage\default\[도메인]` (Windows)
- **키**:
  - `eisenhower-todos`: 투두 리스트
  - `memos`: 메모 목록
  - `diaries`: 일기 목록
  - `diary-entries`: 일기 엔트리 (날짜별)
  - `time-planner-data`: 시간 계획 데이터
  - `time-record-data`: 시간 기록 데이터
  - 기타 설정 데이터

### Electron 앱 버전
- **위치**: 
  - **localStorage**: Electron의 내장 localStorage (메모리 기반, 앱 종료 시 유지)
  - **SQLite**: 투두 메모는 SQLite 데이터베이스에 저장
    - Windows: `%AppData%\ToDaDot\database.db`
    - macOS: `~/Library/Application Support/ToDaDot/database.db`
    - Linux: `~/.config/ToDaDot/database.db`

## 🔄 로그인 시 동기화 흐름

### 1. 로그인 전 (로컬 모드)
- 모든 데이터는 **localStorage**에 저장됩니다
- Electron 앱의 경우 투두 메모는 **SQLite**에 저장됩니다
- 데이터는 기기 내에서만 유지됩니다

### 2. 로그인 시
1. **로컬 데이터 확인**: localStorage에서 기존 데이터를 불러옵니다
2. **Firestore 데이터 불러오기**: 로그인한 계정의 Firestore에서 데이터를 불러옵니다
3. **데이터 병합**: 
   - 로컬 데이터와 Firestore 데이터를 병합합니다
   - **로컬 데이터 우선**: 같은 ID가 있으면 로컬 데이터를 유지합니다
   - Firestore에 없는 로컬 데이터는 추가됩니다
4. **로컬 데이터 가져오기 팝업**: 로컬 데이터가 있고 아직 마이그레이션되지 않았다면 팝업이 표시됩니다
5. **마이그레이션**: 사용자가 "가져오기"를 선택하면 로컬 데이터를 Firestore로 업로드합니다

### 3. 로그인 후 (동기화 모드)
- **저장 시**: 
  - localStorage에 저장 (백업)
  - Firestore에 저장 (클라우드 동기화)
- **불러오기 시**:
  - Firestore에서 불러옵니다
  - 로컬 데이터와 병합하여 표시합니다
- **기기 간 동기화**: 
  - 모든 기기에서 같은 Firebase 계정으로 로그인하면 데이터가 동기화됩니다
  - 최신 데이터가 우선됩니다 (마지막 저장 시간 기준)

## ⚠️ 주의사항

### 데이터 손실 방지
1. **로컬 데이터는 항상 보존됩니다**
   - Firestore에 데이터가 없어도 로컬 데이터는 유지됩니다
   - 병합 시 로컬 데이터가 우선됩니다

2. **마이그레이션 플래그**
   - `firebase-todos-sync-completed`: 투두 마이그레이션 완료 여부
   - `firebase-diaries-memos-sync-completed`: 일기/메모 마이그레이션 완료 여부
   - 이 플래그가 `'true'`로 설정되면 팝업이 표시되지 않습니다

3. **데이터 확인 방법**
   - 브라우저 개발자 도구(F12) → Application → Local Storage에서 확인
   - 또는 `check-local-data.html` 파일을 브라우저에서 열어 확인

## 🔍 데이터 확인 및 복구

### 로컬 데이터 확인
```javascript
// 브라우저 콘솔에서 실행
console.log('투두:', localStorage.getItem('eisenhower-todos'));
console.log('메모:', localStorage.getItem('memos'));
console.log('일기:', localStorage.getItem('diaries'));
```

### 마이그레이션 플래그 초기화
```javascript
// 팝업을 다시 표시하려면
localStorage.removeItem('firebase-todos-sync-completed');
localStorage.removeItem('firebase-diaries-memos-sync-completed');
```

### 데이터 내보내기
- `check-local-data.html` 파일을 브라우저에서 열어 "데이터 내보내기" 버튼 클릭

## ⚠️ 데이터 복구

### 이미 덮어쓰기된 데이터는 복구할 수 없습니다
- localStorage는 덮어쓰기되면 이전 데이터를 복구할 수 없습니다
- 하지만 다음 방법으로 일부 데이터를 복구할 수 있을 수 있습니다:
  1. **Firestore 확인**: 이전에 로그인하여 Firestore에 업로드했다면 복구 가능
  2. **SQLite 데이터베이스**: Electron 앱의 경우 투두 메모는 SQLite에 저장되어 있을 수 있음
  3. **시스템 백업**: Windows 파일 히스토리 또는 macOS Time Machine이 활성화되어 있다면 이전 버전 복구 가능

자세한 내용은 `DATA_RECOVERY_GUIDE.md`를 참고하세요.

## 📊 동기화 상태 확인

로그인 후 콘솔에서 다음 로그를 확인하세요:
- `🔍 로컬 데이터 가져오기 확인`: 인증 상태 확인
- `📋 마이그레이션 상태 확인`: 마이그레이션 완료 여부
- `📦 로컬 데이터 존재 여부`: 로컬 데이터 확인
- `📊 로컬 데이터 개수`: 데이터 개수
- `✅ 로컬 데이터 발견 - 팝업 표시`: 팝업 표시 여부

