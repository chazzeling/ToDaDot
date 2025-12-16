# OAuth Loopback Redirect 설정 가이드

## 개요

ToDaDot은 Google OAuth 2.0 인증을 위해 **루프백 IP 주소 기반 리디렉션** 방식을 사용합니다. 이는 데스크톱 앱의 표준 OAuth 인증 방식입니다.

## 인증 흐름

1. 사용자가 "인증 URL 생성" 버튼 클릭
2. 브라우저에서 Google 인증 페이지 열림
3. 사용자가 Google 계정으로 로그인 및 권한 승인
4. Google이 `http://localhost:8888?code=...` 로 리다이렉트
5. **앱 내부 로컬 HTTP 서버가 콜백을 수신**
6. **IPC를 통해 React 컴포넌트에 코드 전송**
7. **자동으로 토큰 교환 및 인증 완료**

## Google Cloud Console 설정

### 1. 리디렉션 URI 추가

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택
3. **API 및 서비스** → **사용자 인증 정보** 이동
4. OAuth 2.0 클라이언트 ID 클릭하여 편집
5. **승인된 리디렉션 URI** 섹션에서:
   - 기존 `todadot://auth` URI가 있다면 **삭제**
   - **"+ URI 추가"** 클릭
   - `http://localhost:8888` 입력
   - **저장** 클릭

### 2. 권장 설정

- **애플리케이션 유형**: 데스크톱 앱
- **승인된 리디렉션 URI**: `http://localhost:8888`
  - `http://127.0.0.1:8888`도 가능하지만 `localhost` 권장

## 기술적 구현

### 로컬 HTTP 서버

앱은 시작 시 포트 8888에서 임시 로컬 HTTP 서버를 시작합니다:

- **포트**: 8888
- **주소**: `127.0.0.1` (localhost)
- **용도**: OAuth 콜백 수신
- **자동 시작**: 앱 시작 시 자동으로 서버 시작
- **자동 종료**: 앱 종료 시 자동으로 서버 종료

### 콜백 처리

1. Google OAuth 서버가 `http://localhost:8888?code=AUTHORIZATION_CODE`로 리다이렉트
2. 로컬 HTTP 서버가 요청을 받아 쿼리 파라미터 파싱
3. 인증 코드를 IPC를 통해 렌더러 프로세스로 전송
4. 브라우저에는 성공 페이지 표시

## 장점

- ✅ Google OAuth 2.0 보안 정책 준수
- ✅ 커스텀 프로토콜 등록 불필요
- ✅ 크로스 플랫폼 호환성 (Windows, macOS, Linux 모두 동일 방식)
- ✅ 표준 데스크톱 앱 인증 방식

## 문제 해결

### 포트가 이미 사용 중인 경우

포트 8888이 다른 프로그램에서 사용 중일 수 있습니다:

1. **포트 확인**:
   ```powershell
   # Windows
   netstat -ano | findstr :8888
   ```

2. **포트 변경**: 코드에서 `OAUTH_REDIRECT_PORT` 값을 다른 포트(예: 8889, 8887)로 변경 후 Google Cloud Console에도 동일하게 등록

### 리디렉션 URI 불일치 오류

- Google Cloud Console의 "승인된 리디렉션 URI"에 `http://localhost:8888`이 정확히 등록되어 있는지 확인
- URI에 슬래시나 경로가 포함되어 있지 않은지 확인 (예: `http://localhost:8888/` ❌)

### 방화벽 경고

일부 방화벽이 로컬 HTTP 서버를 차단할 수 있습니다. 이 경우 방화벽 설정에서 ToDaDot 앱을 허용해야 합니다.



