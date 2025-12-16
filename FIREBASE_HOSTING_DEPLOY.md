# Firebase Hosting 배포 가이드

## 1. Firebase CLI 설치

터미널에서 다음 명령어를 실행하세요:

```bash
npm install -g firebase-tools
```

## 2. Firebase 로그인

```bash
firebase login
```

브라우저가 열리면 Google 계정으로 로그인하세요.

## 3. 프로젝트 확인

현재 프로젝트가 올바르게 설정되어 있는지 확인:

```bash
firebase projects:list
```

`todadot-897fd` 프로젝트가 목록에 있어야 합니다.

## 4. 웹 빌드 (이미 완료됨)

```bash
npm run build:web
```

## 5. Firebase Hosting 배포

```bash
firebase deploy --only hosting
```

배포가 완료되면 다음과 같은 URL이 표시됩니다:
- `https://todadot-897fd.web.app`
- `https://todadot-897fd.firebaseapp.com`

## 문제 해결

### "Site Not Found" 오류가 계속 발생하는 경우:

1. Firebase Console에서 Hosting이 활성화되어 있는지 확인:
   - https://console.firebase.google.com/project/todadot-897fd/hosting
   - "시작하기" 버튼을 클릭하여 Hosting을 활성화

2. 배포가 완료되었는지 확인:
   ```bash
   firebase hosting:channel:list
   ```

3. 배포 로그 확인:
   ```bash
   firebase deploy --only hosting --debug
   ```

