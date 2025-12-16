# ToDaDot PC 설치 프로그램 만들기 가이드

## 전체 과정 개요

이 가이드는 ToDaDot을 Windows PC에 설치할 수 있는 `.exe` 설치 파일로 만드는 전체 과정을 단계별로 설명합니다.

## 사전 준비사항

### 1. 필수 소프트웨어 설치

- **Node.js** (v18 이상 권장)
  - 다운로드: https://nodejs.org/
  - 설치 후 터미널에서 확인: `node --version`, `npm --version`

- **Git** (선택사항, 소스 코드 관리용)
  - 다운로드: https://git-scm.com/

### 2. 프로젝트 의존성 설치

프로젝트 폴더에서 다음 명령어 실행:

```bash
npm install
```

이 명령어는 `package.json`에 정의된 모든 의존성을 설치합니다.

## 빌드 과정

### 단계 1: TypeScript 컴파일 및 Electron 메인 프로세스 빌드

```bash
npm run electron:build:main
```

이 명령어는:
- `electron/vite.config.ts`를 사용하여 Electron 메인 프로세스(`main.ts`, `preload.ts`)를 빌드
- 결과물은 `dist-electron/` 폴더에 생성됩니다

### 단계 2: React 앱 빌드

```bash
npm run build
```

또는 Vite 빌드만:

```bash
vite build
```

이 명령어는:
- React 앱을 빌드하여 `dist/` 폴더에 생성
- TypeScript를 JavaScript로 컴파일
- 최적화된 프로덕션 빌드 생성

### 단계 3: Electron 앱 패키징

```bash
npm run electron:build:app
```

또는 전체 빌드를 한 번에:

```bash
npm run build
```

이 명령어는:
- `electron-builder`를 사용하여 Windows 설치 파일 생성
- 결과물은 `release/` 폴더에 생성됩니다

## 빌드 결과물

빌드가 성공하면 `release/` 폴더에 다음 파일들이 생성됩니다:

### Windows 설치 파일
- **파일명**: `ToDaDot Setup 1.0.0.exe`
- **위치**: `release/ToDaDot Setup 1.0.0.exe`
- **용도**: 사용자가 다운로드하여 실행하면 설치 마법사가 시작됩니다
- **특징**: 
  - 설치 경로 선택 가능
  - 시작 메뉴에 바로가기 자동 생성
  - 제거 프로그램 포함

### 포터블 버전 (선택사항)
- **파일명**: `ToDaDot-1.0.0-win.zip`
- **용도**: 압축 해제 후 바로 실행 가능한 포터블 버전

## 아이콘 설정

### 아이콘 파일 준비

1. `.ico` 형식의 아이콘 파일을 준비합니다
   - 권장 크기: 256x256 픽셀
   - 온라인 변환 도구 사용 가능 (PNG → ICO)

2. 아이콘 파일을 다음 위치에 저장:
   ```
   build/icon.ico
   ```

3. 아이콘 파일이 없으면 기본 Electron 아이콘이 사용됩니다

## 빌드 설정 커스터마이징

`package.json`의 `build` 섹션을 수정하여 빌드 옵션을 변경할 수 있습니다:

```json
{
  "build": {
    "appId": "com.todadot.app",           // 앱 고유 ID
    "productName": "ToDaDot",             // 앱 이름
    "directories": {
      "output": "release"                 // 빌드 결과물 폴더
    },
    "files": [
      "dist/**/*",                        // React 빌드 결과물
      "dist-electron/**/*",               // Electron 빌드 결과물
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",               // NSIS 설치 프로그램
          "arch": ["x64"]                  // 64비트 아키텍처
        }
      ],
      "icon": "build/icon.ico"            // 아이콘 경로
    },
    "nsis": {
      "oneClick": false,                  // 원클릭 설치 비활성화
      "allowToChangeInstallationDirectory": true  // 설치 경로 선택 가능
    }
  }
}
```

## 사전 요구사항: Visual C++ Redistributable

### 중요: 설치 전 필수 확인

ToDaDot 앱을 실행하려면 **Visual C++ 2015-2022 Redistributable (x64)**가 필요합니다.

#### 확인 방법

1. **레지스트리 확인**:
   ```powershell
   Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue
   ```

2. **설치된 프로그램 목록 확인**:
   - 제어판 → 프로그램 및 기능
   - "Microsoft Visual C++ 2015-2022 Redistributable" 검색

#### 설치 방법

**다운로드 링크**: https://aka.ms/vs/17/release/vc_redist.x64.exe

1. 위 링크에서 다운로드
2. 설치 실행
3. 설치 완료 후 ToDaDot 앱 실행

#### 문제 증상

Visual C++ Redistributable이 없으면:
- 앱이 실행되지 않음
- 오류 메시지 없이 종료
- Windows 이벤트 로그에 오류 기록

## 빌드 문제 해결

### 문제 1: 빌드 실패

**증상**: `npm run build` 실행 시 에러 발생

**해결 방법**:
1. 모든 의존성이 설치되었는지 확인: `npm install`
2. TypeScript 오류 확인: `npm run build` 출력 메시지 확인
3. Node.js 버전 확인 (v18 이상 권장)

### 문제 2: 아이콘 파일을 찾을 수 없음

**증상**: `icon.ico not found` 경고

**해결 방법**:
1. `build/icon.ico` 파일이 존재하는지 확인
2. 파일 경로가 올바른지 확인
3. 아이콘 파일이 없어도 빌드는 가능하지만 기본 아이콘이 사용됩니다

### 문제 3: Windows Defender 경고

**증상**: 생성된 `.exe` 파일 실행 시 Windows Defender 경고

**해결 방법**:
- 코드 서명이 없는 경우 정상적인 현상입니다
- 사용자에게 "추가 정보" → "실행" 클릭하도록 안내
- 프로덕션 배포 시 코드 서명 인증서를 구매하여 서명하는 것을 권장

### 문제 4: 앱이 실행되지 않음

**증상**: 설치 후 앱 실행 시 아무 반응 없음 또는 즉시 종료

**해결 방법**:
1. **Visual C++ Redistributable 확인** (위 참고)
2. **Windows 이벤트 로그 확인**:
   - 이벤트 뷰어 → Windows 로그 → 응용 프로그램
   - ToDaDot.exe 관련 오류 검색
   - Faulting module name 확인
3. **앱 실행 경로 확인**:
   ```
   C:\Users\[사용자명]\AppData\Local\Programs\ToDaDot\ToDaDot.exe
   ```

## 배포 준비

### 1. 빌드 결과물 확인

`release/` 폴더에서 다음을 확인:
- `ToDaDot Setup 1.0.0.exe` 파일이 생성되었는지
- 파일 크기가 적절한지 (보통 100MB 이상)

### 2. 테스트 설치

생성된 설치 파일을 다른 PC나 가상 머신에서 테스트:
1. 설치 파일 실행
2. 설치 과정이 정상적으로 진행되는지 확인
3. 설치된 앱이 정상적으로 실행되는지 확인
4. 제거 프로그램이 정상 작동하는지 확인

### 3. 배포

다음 방법으로 배포할 수 있습니다:

#### 옵션 1: 직접 배포
- 파일 호스팅 서비스 (Google Drive, Dropbox 등)에 업로드
- 사용자에게 다운로드 링크 제공

#### 옵션 2: 웹사이트 배포
- 자신의 웹사이트에 다운로드 페이지 생성
- 설치 파일 업로드 및 다운로드 링크 제공

#### 옵션 3: GitHub Releases
- GitHub 저장소의 Releases 섹션에 업로드
- 버전별로 관리 가능

## 추가 기능 (선택사항)

### 코드 서명

프로덕션 배포 시 코드 서명을 추가하면 Windows Defender 경고를 줄일 수 있습니다:

1. 코드 서명 인증서 구매 (DigiCert, Sectigo 등)
2. `package.json`에 추가:

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "your-password"
    }
  }
}
```

### 자동 업데이트

`electron-updater`를 사용하여 자동 업데이트 기능을 추가할 수 있습니다:

1. 설치: `npm install electron-updater`
2. 업데이트 서버 설정
3. 앱에 업데이트 체크 로직 추가

## 빌드 명령어 요약

```bash
# 전체 빌드 (한 번에)
npm run build

# 단계별 빌드
npm run electron:build:main    # Electron 메인 프로세스 빌드
vite build                      # React 앱 빌드
npm run electron:build:app    # Electron 앱 패키징

# 개발 모드 실행
npm run electron:dev
```

## 빌드 시간

- 첫 빌드: 5-10분 (의존성 다운로드 포함)
- 이후 빌드: 1-3분

## 주의사항

1. **빌드 전 확인사항**:
   - 모든 기능이 정상 작동하는지 테스트
   - 개발자 도구가 비활성화되어 있는지 확인 (프로덕션 빌드)
   - 불필요한 파일이 포함되지 않았는지 확인

2. **파일 크기**:
   - Electron 앱은 기본적으로 100MB 이상입니다
   - `better-sqlite3` 같은 네이티브 모듈이 포함되어 크기가 큽니다

3. **보안**:
   - 코드 서명이 없으면 Windows Defender 경고가 나타날 수 있습니다
   - 사용자에게 신뢰할 수 있는 출처임을 안내하세요

## 문제 발생 시

빌드 중 문제가 발생하면:

1. 에러 메시지를 자세히 확인
2. `node_modules` 폴더 삭제 후 `npm install` 재실행
3. `dist/`, `dist-electron/`, `release/` 폴더 삭제 후 재빌드
4. GitHub Issues 또는 관련 문서 참조








