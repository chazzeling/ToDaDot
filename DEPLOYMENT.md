# ToDaDot 배포 가이드

## PC 프로그램으로 배포하기

### 1. 빌드 준비

프로젝트는 이미 `electron-builder`가 설정되어 있습니다. 다음 명령어로 빌드할 수 있습니다:

```bash
npm run build
```

또는 단계별로:

```bash
# 1. TypeScript 컴파일 및 Vite 빌드
npm run electron:build:main

# 2. Electron 앱 빌드
npm run electron:build:app
```

### 2. 빌드 결과물

빌드가 완료되면 `release` 폴더에 다음 파일들이 생성됩니다:

- Windows: `ToDaDot Setup x.x.x.exe` (설치 파일)
- 또는 `ToDaDot-x.x.x-win.zip` (포터블 버전)

### 3. 배포 옵션

#### 옵션 1: 설치 파일 배포
- `release/ToDaDot Setup x.x.x.exe` 파일을 배포
- 사용자가 다운로드하여 실행하면 설치 마법사가 시작됩니다
- 설치 경로를 선택할 수 있습니다 (NSIS 설정)

#### 옵션 2: 포터블 버전 배포
- 압축 파일을 배포하여 사용자가 압축 해제 후 바로 실행 가능

### 4. 아이콘 설정

`build/icon.ico` 파일이 있어야 합니다. 아이콘 파일이 없다면:
1. `.ico` 형식의 아이콘 파일을 `build/icon.ico`에 저장
2. 또는 `package.json`의 `build.win.icon` 경로를 수정

### 5. 추가 설정

`package.json`의 `build` 섹션에서 다음을 수정할 수 있습니다:

- `appId`: 앱의 고유 ID
- `productName`: 앱 이름
- `win.target`: 빌드 타겟 (nsis, portable 등)

### 6. 코드 서명 (선택사항)

프로덕션 배포 시 코드 서명을 추가하려면 `package.json`에 다음을 추가:

```json
"build": {
  "win": {
    "certificateFile": "path/to/certificate.pfx",
    "certificatePassword": "password"
  }
}
```

### 7. 자동 업데이트 (선택사항)

자동 업데이트 기능을 추가하려면 `electron-updater`를 사용할 수 있습니다.

## 참고사항

- 첫 빌드는 시간이 걸릴 수 있습니다 (의존성 다운로드 포함)
- Windows Defender나 바이러스 백신에서 경고가 나올 수 있습니다 (코드 서명이 없는 경우)
- 빌드 전에 `npm install`을 실행하여 모든 의존성이 설치되어 있는지 확인하세요











