# macOS 빌드 가이드 (GitHub Actions)

## 개요

이 가이드는 GitHub Actions를 사용하여 macOS용 .dmg 파일을 생성하는 방법을 설명합니다.

## 사전 준비

### 1. GitHub 저장소 설정

1. GitHub 저장소에 코드를 푸시합니다.
2. `.github/workflows/build.yml` 파일이 포함되어 있는지 확인합니다.

### 2. Secrets 설정 (선택사항 - 코드 서명용)

코드 서명이 필요한 경우 GitHub 저장소에 다음 Secrets를 추가합니다:

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. 다음 Secrets 추가:
   - `APPLE_ID`: Apple Developer 계정 이메일
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-Specific Password (2단계 인증 활성화 필요)
   - `APPLE_TEAM_ID`: Apple Developer Team ID

**참고**: 코드 서명 없이도 빌드는 가능하지만, 사용자가 Gatekeeper 경고를 받을 수 있습니다.

## 빌드 실행 방법

### 방법 1: 태그를 통한 자동 빌드

```bash
# 버전 태그 생성 및 푸시
git tag v1.0.0
git push origin v1.0.0
```

태그가 푸시되면 자동으로 빌드가 시작되고, 완료되면 GitHub Releases에 업로드됩니다.

### 방법 2: 수동 빌드 (Workflow Dispatch)

1. GitHub 저장소 → Actions 탭
2. "Build and Release" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. 플랫폼 선택:
   - `all`: Windows와 macOS 모두 빌드
   - `mac`: macOS만 빌드
   - `win`: Windows만 빌드
5. "Run workflow" 클릭

## 빌드 결과 확인

### Artifacts 다운로드

1. GitHub 저장소 → Actions 탭
2. 실행된 워크플로우 클릭
3. "macos-build" 또는 "windows-build" Artifacts 섹션에서 다운로드

### GitHub Releases

태그를 통한 빌드의 경우:
1. GitHub 저장소 → Releases 탭
2. 생성된 릴리스에서 다운로드

## 빌드 결과물

### macOS
- `ToDaDot-1.0.0.dmg`: DMG 설치 파일
- `ToDaDot-1.0.0-mac.zip`: ZIP 압축 파일 (x64, arm64 포함)

### Windows
- `ToDaDot Setup 1.0.0.exe`: NSIS 설치 파일
- `ToDaDot Setup 1.0.0.exe.blockmap`: 업데이트용 블록맵

## 빌드 시간

- macOS 빌드: 약 10-15분
- Windows 빌드: 약 8-12분
- 전체 빌드 (모든 플랫폼): 약 15-20분

## 문제 해결

### 빌드 실패 시

1. **의존성 문제**
   - `npm ci`가 실패하는 경우: `package-lock.json` 확인
   - Node.js 버전 확인 (v20 권장)

2. **빌드 스크립트 오류**
   - 로컬에서 `npm run electron:build:main` 테스트
   - 로컬에서 `npm run build` 테스트

3. **코드 서명 오류**
   - Secrets 설정 확인
   - 코드 서명 없이 빌드하려면 `CSC_IDENTITY_AUTO_DISCOVERY: false` 확인

### 로그 확인

1. GitHub Actions → 실행된 워크플로우
2. 실패한 Job 클릭
3. 실패한 Step의 로그 확인

## 로컬 테스트

GitHub Actions에서 빌드하기 전에 로컬에서 테스트:

```bash
# 의존성 설치
npm ci

# Electron 메인 프로세스 빌드
npm run electron:build:main

# React 앱 빌드
npm run build

# macOS 빌드 (macOS에서만 가능)
npx electron-builder --mac --x64 --arm64
```

## 추가 설정

### package.json 빌드 설정 확인

`package.json`의 `build.mac` 섹션이 올바르게 설정되어 있는지 확인:

```json
{
  "build": {
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "category": "public.app-category.productivity"
    }
  }
}
```

### 아이콘 파일

- macOS용 아이콘: `build/icon.icns` 또는 `icon.png` (자동 변환)
- 현재 프로젝트에는 `icon.png` (512x512)가 있으므로 자동으로 사용됩니다.

## 참고사항

1. **무료 GitHub Actions 시간 제한**
   - Public 저장소: 무제한
   - Private 저장소: 월 2,000분 무료

2. **빌드 캐시**
   - Node.js 모듈은 자동으로 캐시됩니다.
   - 첫 빌드는 더 오래 걸릴 수 있습니다.

3. **코드 서명 없이 배포**
   - 코드 서명 없이도 빌드 및 배포 가능
   - 사용자는 "보안 설정"에서 앱 실행 허용 필요

4. **자동 업데이트**
   - `electron-updater`를 사용하면 자동 업데이트 기능 추가 가능
   - GitHub Releases를 업데이트 서버로 사용 가능





