# Windows → macOS 데이터 마이그레이션 가이드

Windows PC에서 만든 할일 목록을 MacBook에서도 보려면 다음 파일들을 복사해야 합니다.

## 📍 데이터 저장 위치

### Windows
```
C:\Users\[사용자명]\AppData\Roaming\ToDaDot
또는
C:\Users\[사용자명]\AppData\Local\ToDaDot
```

**빠른 접근 방법:**
1. `Win + R` 키 누르기
2. `%APPDATA%\ToDaDot` 입력 후 Enter
3. 또는 `%LOCALAPPDATA%\ToDaDot` 입력 후 Enter

### macOS
```
~/Library/Application Support/ToDaDot
```

**빠른 접근 방법:**
1. Finder 열기
2. `Cmd + Shift + G` 누르기
3. `~/Library/Application Support/ToDaDot` 입력 후 Enter

## 📦 복사해야 할 파일들

### 필수 파일 (할일 목록 포함)

#### 1. localStorage 데이터 (가장 중요!)
**위치:**
```
Windows: C:\Users\[사용자명]\AppData\Roaming\ToDaDot\Local Storage\leveldb\
macOS: ~/Library/Application Support/ToDaDot/Local Storage/leveldb/
```

**또는 Electron의 localStorage는 LevelDB 형식으로 저장되므로:**
- Windows: `C:\Users\[사용자명]\AppData\Roaming\ToDaDot\Local Storage\leveldb\` 폴더 전체
- macOS: `~/Library/Application Support/ToDaDot/Local Storage/leveldb/` 폴더 전체

**포함되는 데이터:**
- ✅ 할일 목록 (`eisenhower-todos`)
- ✅ 카테고리 (`categories`)
- ✅ 일정 (`events`, `event-categories`)
- ✅ 일기/메모 (`diaries`, `memos`)
- ✅ 기분 추적 (`mood-tracker`)
- ✅ 매트릭스 색상 설정
- ✅ 테마 설정

#### 2. SQLite 데이터베이스
**파일명:** `todadot.db`
**위치:**
- Windows: `C:\Users\[사용자명]\AppData\Roaming\ToDaDot\todadot.db`
- macOS: `~/Library/Application Support/ToDaDot/todadot.db`

**포함되는 데이터:**
- ✅ 할일 메모 (memos 테이블)
- ✅ 헤더 이미지 (header_images 테이블)
- ✅ 캘린더 스티커 (calendar_stickers 테이블)
- ✅ 스티커 레이아웃 (sticker_layouts 테이블)

### 선택적 파일 (있는 경우만)

#### 3. 스티커 이미지 폴더
**폴더명:** `images/` 또는 `stickers/`
**위치:**
- Windows: `C:\Users\[사용자명]\AppData\Roaming\ToDaDot\images\`
- macOS: `~/Library/Application Support/ToDaDot/images/`

#### 4. Google OAuth 토큰 (Google Calendar 사용 시)
**파일명:** `google-token.json`
**위치:**
- Windows: `C:\Users\[사용자명]\AppData\Roaming\ToDaDot\google-token.json`
- macOS: `~/Library/Application Support/ToDaDot/google-token.json`

#### 5. Firebase 토큰 (Firebase 사용 시)
**파일명:** `firebase-token.json`
**위치:**
- Windows: `C:\Users\[사용자명]\AppData\Roaming\ToDaDot\firebase-token.json`
- macOS: `~/Library/Application Support/ToDaDot/firebase-token.json`

## 🔄 마이그레이션 단계별 가이드

### 1단계: Windows에서 파일 찾기

1. **Windows 탐색기 열기**
2. 주소창에 다음 중 하나 입력:
   ```
   %APPDATA%\ToDaDot
   ```
   또는
   ```
   %LOCALAPPDATA%\ToDaDot
   ```

3. **확인해야 할 파일/폴더:**
   - `todadot.db` 파일
   - `Local Storage` 폴더 (있으면)
   - `images/` 또는 `stickers/` 폴더 (있으면)
   - `google-token.json` (Google Calendar 사용 시)
   - `firebase-token.json` (Firebase 사용 시)

### 2단계: 파일 복사

**방법 1: USB 드라이브 사용**
1. USB 드라이브에 `ToDaDot-Data` 폴더 생성
2. 위의 파일들을 모두 복사

**방법 2: 클라우드 드라이브 사용**
1. Google Drive, Dropbox, OneDrive 등에 `ToDaDot-Data` 폴더 생성
2. 위의 파일들을 모두 업로드
3. macOS에서 다운로드

**방법 3: 네트워크 공유**
1. Windows와 macOS가 같은 네트워크에 연결
2. 네트워크 공유 폴더 사용

### 3단계: macOS에서 파일 복사

1. **macOS에서 ToDaDot 앱 실행 (한 번만)**
   - 앱을 실행하면 데이터 폴더가 자동 생성됩니다

2. **Finder에서 데이터 폴더 열기**
   - `Cmd + Shift + G` 누르기
   - `~/Library/Application Support/ToDaDot` 입력

3. **Windows에서 복사한 파일들을 붙여넣기**
   - `todadot.db` 파일 복사
   - `Local Storage` 폴더가 있으면 전체 복사
   - `images/` 폴더가 있으면 전체 복사
   - 기타 JSON 파일들 복사

4. **기존 파일 덮어쓰기 확인**
   - macOS에 이미 데이터가 있으면 덮어쓰기 선택

### 4단계: 앱 재시작

1. ToDaDot 앱 완전 종료
2. 앱 다시 실행
3. 할일 목록이 표시되는지 확인

## ⚠️ 주의사항

### 1. 앱 실행 중에는 복사하지 마세요
- 앱이 실행 중이면 파일이 잠겨있을 수 있습니다
- 반드시 앱을 완전히 종료한 후 복사하세요

### 2. 파일 경로 확인
- Windows와 macOS의 경로가 다를 수 있습니다
- `%APPDATA%`와 `%LOCALAPPDATA%` 둘 다 확인해보세요

### 3. LevelDB 폴더 복사
- `Local Storage/leveldb/` 폴더는 숨겨져 있을 수 있습니다
- Windows 탐색기에서 "숨김 파일 표시" 활성화 필요

### 4. 백업 권장
- 복사하기 전에 macOS의 기존 데이터를 백업하세요
- 문제가 발생하면 원래 상태로 복구할 수 있습니다

## 🔍 파일이 없는 경우

### localStorage 데이터를 찾을 수 없는 경우

Electron 앱의 localStorage는 LevelDB 형식으로 저장됩니다. 다음 위치를 확인하세요:

**Windows:**
```
C:\Users\[사용자명]\AppData\Roaming\ToDaDot\Local Storage\leveldb\
C:\Users\[사용자명]\AppData\Local\ToDaDot\Local Storage\leveldb\
```

**macOS:**
```
~/Library/Application Support/ToDaDot/Local Storage/leveldb/
```

이 폴더가 보이지 않으면:
1. Windows 탐색기에서 "숨김 파일 표시" 활성화
2. macOS Finder에서 `Cmd + Shift + .` (점) 눌러서 숨김 파일 표시

## 📝 간단한 체크리스트

- [ ] Windows에서 ToDaDot 앱 종료
- [ ] `%APPDATA%\ToDaDot` 또는 `%LOCALAPPDATA%\ToDaDot` 폴더 확인
- [ ] `todadot.db` 파일 복사
- [ ] `Local Storage/leveldb/` 폴더 복사 (있으면)
- [ ] `images/` 폴더 복사 (있으면)
- [ ] macOS에서 ToDaDot 앱 실행 (한 번만, 폴더 생성용)
- [ ] macOS에서 앱 종료
- [ ] `~/Library/Application Support/ToDaDot` 폴더에 파일 붙여넣기
- [ ] macOS에서 ToDaDot 앱 재시작
- [ ] 할일 목록 확인

## 🆘 문제 해결

### 할일 목록이 표시되지 않는 경우

1. **파일 경로 확인**
   - Windows와 macOS 모두에서 정확한 경로인지 확인

2. **파일 권한 확인**
   - macOS에서 파일 권한이 올바른지 확인
   - 필요시 `chmod` 명령어로 권한 수정

3. **앱 로그 확인**
   - macOS에서 앱 실행 후 콘솔 로그 확인
   - 오류 메시지가 있는지 확인

4. **데이터베이스 파일 확인**
   - `todadot.db` 파일이 손상되지 않았는지 확인
   - 파일 크기가 0이 아닌지 확인

## 💡 팁

### 자동 동기화 (향후)
- 현재는 수동 복사가 필요하지만, 향후 Firebase 로그인 기능이 활성화되면 자동 동기화가 가능합니다

### 정기적 백업
- 중요한 데이터는 정기적으로 백업하세요
- USB 드라이브나 클라우드에 백업 보관

