# Firebase Electron 앱 도메인 오류 해결 가이드

## 문제
Electron 앱에서 로그인 시 `Firebase: Error (auth/unauthorized-domain)` 오류가 발생합니다.

## 원인
프로덕션 모드에서 Electron 앱은 `file://` 프로토콜을 사용하는데, Firebase는 `file://` 프로토콜을 허용하지 않습니다.

## 해결 방법

### 방법 1: webSecurity 비활성화 (권장, 이미 적용됨)
`electron/main.ts`에서 `webSecurity: false`로 설정했습니다. 이렇게 하면 `file://` 프로토콜에서도 Firebase Authentication이 작동합니다.

**참고**: Electron 앱 내부에서만 사용되므로 보안상 문제 없습니다.

### 방법 2: Firebase Console에서 도메인 추가 (추가 확인)
만약 여전히 문제가 발생한다면:

1. Firebase Console 접속:
   - https://console.firebase.google.com/project/todadot-897fd/authentication/settings

2. 허용된 도메인 확인:
   - **인증** → **설정** 탭 클릭
   - **허용된 도메인** 섹션에서 다음이 포함되어 있는지 확인:
     - `localhost`
     - `127.0.0.1` (필요시 추가)

3. 저장 후 앱 재시작

## 참고
- `webSecurity: false` 설정으로 대부분의 경우 해결됩니다.
- 도메인 추가 후 변경 사항이 적용되기까지 몇 분 정도 걸릴 수 있습니다.
- 개발 모드(`http://localhost:5173`)에서는 문제가 없고, 프로덕션 모드(`file://`)에서만 발생하는 문제입니다.
- **중요**: `webSecurity: false`로 설정해도 Firebase는 여전히 도메인 검증을 수행합니다. 따라서 Firebase Console에 `localhost`가 반드시 추가되어 있어야 합니다.

## 디버깅
앱의 개발자 도구 콘솔에서 다음 메시지를 확인하세요:
- `🌐 Current origin:` - 실제로 사용되는 origin
- `⚠️ Electron file:// protocol detected` - file:// 프로토콜 사용 감지

이 정보를 통해 어떤 도메인을 Firebase Console에 추가해야 하는지 확인할 수 있습니다.

