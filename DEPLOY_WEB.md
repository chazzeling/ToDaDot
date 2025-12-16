# 웹 버전 배포 가이드

## 1. Firebase CLI 로그인

터미널에서 다음 명령어를 실행하세요:

```bash
firebase login
```

- Gemini 기능 활성화 여부를 묻는 프롬프트가 나타나면 `Y` 또는 `n`을 선택하세요 (선택 사항)
- 브라우저가 열리면 Google 계정으로 로그인하세요
- 로그인이 완료되면 터미널에 "Success! Logged in as ..." 메시지가 표시됩니다

## 2. 웹 빌드

```bash
npm run build:web
```

빌드가 완료되면 `dist` 폴더에 웹 파일들이 생성됩니다.

## 3. Firebase Hosting 배포

```bash
firebase deploy --only hosting
```

배포가 완료되면 다음과 같은 URL이 표시됩니다:
- **프로덕션 URL**: `https://todadot-897fd.web.app`
- **기본 URL**: `https://todadot-897fd.firebaseapp.com`

## 4. 배포 확인

브라우저에서 위 URL로 접속하여 앱이 정상적으로 작동하는지 확인하세요.

## 문제 해결

### "No authorized accounts" 오류
- `firebase login` 명령어를 다시 실행하세요

### "Site Not Found" 오류
- Firebase Console에서 Hosting이 활성화되어 있는지 확인:
  - https://console.firebase.google.com/project/todadot-897fd/hosting
  - "시작하기" 버튼을 클릭하여 Hosting을 활성화

### 배포 실패
- `firebase deploy --only hosting --debug` 명령어로 상세 로그 확인

## 업데이트 배포

코드를 수정한 후 다시 배포하려면:

```bash
npm run build:web
firebase deploy --only hosting
```

