# OAuth Custom Protocol 설정 가이드

## 완료된 작업

### 1. Custom Protocol 등록
- `app.setAsDefaultProtocolClient('todadot')` 추가
- Windows에서 `todadot://` 프로토콜 처리 가능

### 2. OAuth 리다이렉트 URI 변경
- **이전**: `urn:ietf:wg:oauth:2.0:oob` (수동 코드 입력)
- **현재**: `todadot://auth` (자동 처리)

### 3. IPC 통신 구현
- `main.ts`: Custom Protocol URI 파싱 및 IPC 전송
- `preload.ts`: OAuth 코드/에러 이벤트 리스너 추가
- `GoogleApiSettings.tsx`: 자동 토큰 교환 로직 추가

## Google Cloud Console 설정 (필수)

### 리다이렉트 URI 추가

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보** 이동
4. OAuth 2.0 클라이언트 ID 클릭
5. **승인된 리디렉션 URI** 섹션에서:
   - **URI 추가** 클릭
   - `todadot://auth` 입력
   - **저장** 클릭

### 현재 설정된 리다이렉트 URI

- ✅ `urn:ietf:wg:oauth:2.0:oob` (기존, 수동 입력용 - 유지 가능)
- ✅ `todadot://auth` (새로 추가, 자동 처리용)

## OAuth 인증 흐름

### 자동 처리 방식 (새로운 방식)

1. 사용자가 "인증 URL 생성" 클릭
2. 브라우저에서 Google 인증 페이지 열림
3. 사용자가 Google 계정으로 로그인 및 권한 승인
4. Google이 `todadot://auth?code=...` 로 리다이렉트
5. **앱이 자동으로 열리고 인증 코드 수신**
6. **IPC를 통해 React 컴포넌트에 코드 전송**
7. **자동으로 토큰 교환 및 인증 완료**

### 수동 입력 방식 (기존 방식, 여전히 사용 가능)

1. 사용자가 "인증 URL 생성" 클릭
2. 브라우저에서 Google 인증 페이지 열림
3. 사용자가 Google 계정으로 로그인 및 권한 승인
4. Google이 인증 코드를 화면에 표시
5. 사용자가 코드를 복사하여 앱에 입력
6. "인증 완료" 버튼 클릭
7. 토큰 교환 및 인증 완료

## 코드 변경 사항

### electron/main.ts
- Custom Protocol 등록 (`app.setAsDefaultProtocolClient`)
- `second-instance` 이벤트 핸들러 (Windows)
- `open-url` 이벤트 핸들러 (macOS)
- `handleOAuthRedirect()` 함수 추가
- IPC로 `oauth-code-received` 이벤트 전송

### electron/googleApi.ts
- `redirectUri` 변경: `'urn:ietf:wg:oauth:2.0:oob'` → `'todadot://auth'`

### electron/preload.ts
- `onOAuthCodeReceived()` 이벤트 리스너 추가
- `onOAuthError()` 이벤트 리스너 추가
- `removeOAuthListeners()` 함수 추가

### src/components/GoogleApiSettings.tsx
- `useEffect`에서 OAuth 이벤트 리스너 등록
- `handleExchangeCodeWithCode()` 공통 함수 추가
- Custom Protocol로 받은 코드 자동 처리

### package.json
- `build.win.protocols` 설정 추가

## 테스트 방법

1. **Google Cloud Console에서 리다이렉트 URI 추가**
   - `todadot://auth` 추가

2. **앱 재설치**
   - `release\ToDaDot Setup 1.0.0.exe` 실행

3. **OAuth 인증 테스트**
   - 앱 실행
   - Google API 설정 열기
   - "인증 URL 생성" 클릭
   - 브라우저에서 Google 로그인
   - 권한 승인 후 `todadot://auth?code=...` 로 리다이렉트
   - 앱이 자동으로 열리고 인증 완료 확인

## 문제 해결

### Custom Protocol이 작동하지 않는 경우

1. **앱 재설치 확인**
   - Custom Protocol은 설치 시 등록됩니다
   - 재설치가 필요할 수 있습니다

2. **Windows 레지스트리 확인**
   - `HKEY_CURRENT_USER\Software\Classes\todadot` 확인
   - 없으면 재설치 필요

3. **브라우저에서 직접 테스트**
   - 주소창에 `todadot://auth?code=test123` 입력
   - 앱이 열리는지 확인

### OAuth 에러가 발생하는 경우

1. **개발자 도구 확인**
   - F12로 개발자 도구 열기
   - Console 탭에서 에러 메시지 확인
   - Network 탭에서 OAuth 요청 상태 확인

2. **Google Cloud Console 확인**
   - 리다이렉트 URI가 정확히 `todadot://auth`인지 확인
   - Client ID와 Secret이 올바른지 확인

3. **로그 확인**
   - 앱 콘솔에서 Custom Protocol URI 수신 로그 확인
   - IPC 이벤트 전송 로그 확인




