# 데이터 복구 가이드

## ⚠️ 중요한 사실

**localStorage는 덮어쓰기되면 이전 데이터를 복구할 수 없습니다.** localStorage는 브라우저의 임시 저장소이며, 백업 기능이 없습니다.

## 🔍 가능한 복구 방법

### 1. Firestore에 이미 업로드된 데이터 확인

만약 이전에 로그인하여 데이터를 Firestore에 업로드했다면, Firestore에서 데이터를 복구할 수 있습니다.

**확인 방법:**
1. Firebase Console (https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. Firestore Database → 데이터 탭
4. `users/[사용자UID]/todos`, `users/[사용자UID]/diaries`, `users/[사용자UID]/memos` 확인

**복구 방법:**
- Firestore에 데이터가 있다면, 앱에서 로그인하면 자동으로 불러와집니다
- 또는 수동으로 Firestore에서 데이터를 내보내서 복구할 수 있습니다

### 2. Electron 앱의 SQLite 데이터베이스 확인

Electron 앱을 사용했다면, 투두 메모는 SQLite 데이터베이스에 저장되어 있을 수 있습니다.

**위치:**
- Windows: `%AppData%\ToDaDot\todadot.db`
- macOS: `~/Library/Application Support/ToDaDot/todadot.db`
- Linux: `~/.config/ToDaDot/todadot.db`

**확인 방법:**
```bash
# SQLite 데이터베이스 확인 (SQLite CLI 필요)
sqlite3 "C:\Users\[사용자명]\AppData\Roaming\ToDaDot\todadot.db" "SELECT * FROM memos;"
```

### 3. 브라우저의 IndexedDB 확인

일부 브라우저는 localStorage를 IndexedDB에 백업할 수 있습니다.

**확인 방법:**
1. 브라우저 개발자 도구(F12) 열기
2. Application 탭 → IndexedDB 확인
3. `todadot-web-db` 데이터베이스 확인

### 4. 브라우저의 백업/히스토리 기능

일부 브라우저는 자동 백업 기능이 있지만, localStorage는 일반적으로 백업되지 않습니다.

**Chrome/Edge:**
- `chrome://settings/sync`에서 동기화 설정 확인
- 하지만 localStorage는 동기화되지 않습니다

**Firefox:**
- `about:preferences#privacy`에서 백업 설정 확인
- 하지만 localStorage는 백업되지 않습니다

### 5. Windows 파일 히스토리 / Time Machine (macOS)

만약 시스템 백업이 활성화되어 있다면, 이전 버전의 파일을 복구할 수 있을 수 있습니다.

**Windows:**
- `%LocalAppData%\Google\Chrome\User Data\Default\Local Storage\leveldb` 폴더의 이전 버전 확인
- 파일 탐색기에서 폴더 우클릭 → 속성 → 이전 버전 탭

**macOS:**
- Time Machine이 활성화되어 있다면 이전 버전 복구 가능

## 🛡️ 향후 데이터 손실 방지

### 1. 정기적인 데이터 내보내기
- `check-local-data.html` 파일을 사용하여 정기적으로 데이터를 내보내세요
- JSON 파일로 저장하여 백업하세요

### 2. Firestore 동기화 활성화
- 로그인하여 Firestore에 데이터를 동기화하세요
- 이렇게 하면 클라우드에 백업이 저장됩니다

### 3. 자동 백업 기능 추가 (향후 구현)
- 앱에 자동 백업 기능을 추가할 수 있습니다
- 정기적으로 localStorage 데이터를 파일로 내보내는 기능

## 📝 현재 상황 확인

다음 명령어로 현재 데이터 상태를 확인하세요:

```javascript
// 브라우저 콘솔에서 실행
console.log('투두:', localStorage.getItem('eisenhower-todos'));
console.log('메모:', localStorage.getItem('memos'));
console.log('일기:', localStorage.getItem('diaries'));
console.log('Firestore 동기화 상태:', {
  todos: localStorage.getItem('firebase-todos-sync-completed'),
  diariesMemos: localStorage.getItem('firebase-diaries-memos-sync-completed')
});
```

## 💡 결론

**이미 덮어쓰기된 localStorage 데이터는 복구할 수 없습니다.** 하지만:
1. Firestore에 데이터가 있다면 복구 가능
2. Electron 앱의 SQLite 데이터베이스에 일부 데이터가 남아있을 수 있음
3. 시스템 백업이 활성화되어 있다면 이전 버전 복구 가능

가장 확실한 방법은 **Firestore에 데이터가 있는지 확인**하는 것입니다.

