# macOS 빌드 가이드

## 개요

이 가이드는 ToDaDot 앱을 macOS용 데스크톱 애플리케이션으로 빌드하는 방법을 설명합니다.

## 사전 준비사항

### 1. macOS 개발 환경
- **macOS** (macOS 10.13 이상 권장)
- **Xcode Command Line Tools** 설치
  ```bash
  xcode-select --install
  ```
- **Node.js** (v20 이상 권장)
- **npm** 또는 **yarn**

### 2. 프로젝트 의존성 설치
```bash
npm install
```

## 빌드 방법

### 방법 1: DMG 파일 생성 (권장)
```bash
npm run build:mac:dmg
```

이 명령어는 다음을 생성합니다:
- `ToDaDot-1.1.0-beta.dmg` - DMG 설치 파일
- Intel (x64) 및 Apple Silicon (arm64) 아키텍처 모두 지원

### 방법 2: ZIP 파일 생성
```bash
npm run build:mac:zip
```

이 명령어는 다음을 생성합니다:
- `ToDaDot-1.1.0-beta-mac.zip` - ZIP 압축 파일
- Intel (x64) 및 Apple Silicon (arm64) 아키텍처 모두 지원

### 방법 3: 전체 빌드 (DMG + ZIP)
```bash
npm run build:mac
```

## 빌드 결과물

### 위치
- `release/` 폴더

### 파일 형식

#### DMG 파일
- **파일명**: `ToDaDot-1.1.0-beta.dmg`
- **용도**: macOS 설치 디스크 이미지
- **사용법**: 
  1. DMG 파일을 더블클릭하여 마운트
  2. ToDaDot.app을 Applications 폴더로 드래그
  3. 설치 완료

#### ZIP 파일
- **파일명**: `ToDaDot-1.1.0-beta-mac.zip`
- **용도**: 압축된 앱 번들
- **사용법**:
  1. ZIP 파일을 압축 해제
  2. ToDaDot.app을 Applications 폴더로 이동
  3. 실행

#### APP 번들
- **위치**: `release/mac/ToDaDot.app`
- **용도**: 직접 실행 가능한 앱 번들
- **사용법**: 더블클릭하여 실행

## macOS 전용 기능

### 1. 메뉴 바
- **앱 메뉴**: ToDaDot 정보, 서비스, 종료 등
- **파일 메뉴**: 창 닫기
- **편집 메뉴**: 실행 취소, 복사, 붙여넣기 등
- **보기 메뉴**: 새로고침, 개발자 도구, 확대/축소 등
- **창 메뉴**: 최소화, 닫기, 맨 앞으로 가져오기
- **도움말 메뉴**: 앱 정보

### 2. Dock 아이콘
- 앱 아이콘이 Dock에 표시됩니다
- 실행 중인 앱은 Dock에 점으로 표시됩니다

### 3. 시스템 알림
- macOS 알림 시스템과 통합됩니다
- (향후 알림 기능 추가 시 사용)

### 4. Custom Protocol 지원
- `todadot://auth` 프로토콜 지원
- Google OAuth 리다이렉트 처리

## 코드 서명 (선택사항)

### Apple Developer 계정이 있는 경우

1. **인증서 준비**
   - Apple Developer 계정에서 인증서 생성
   - Keychain에 인증서 설치

2. **환경 변수 설정**
   ```bash
   export APPLE_ID="your-apple-id@example.com"
   export APPLE_APP_SPECIFIC_PASSWORD="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```

3. **빌드 실행**
   ```bash
   npm run build:mac
   ```

### 코드 서명 없이 빌드

코드 서명 없이도 빌드는 가능하지만, 사용자가 Gatekeeper 경고를 받을 수 있습니다.

**경고 해결 방법**:
1. 시스템 설정 → 개인 정보 보호 및 보안
2. "확인 없이 열기" 클릭
3. 또는 우클릭 → 열기

## 문제 해결

### 빌드 실패 시

1. **의존성 문제**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **네이티브 모듈 빌드 오류**
   ```bash
   npm run rebuild
   ```

3. **Xcode Command Line Tools 확인**
   ```bash
   xcode-select --print-path
   ```

### 실행 오류

1. **Gatekeeper 경고**
   - 시스템 설정에서 허용
   - 또는 우클릭 → 열기

2. **권한 오류**
   - 시스템 설정 → 개인 정보 보호 및 보안
   - 필요한 권한 허용

## 빌드 설정 커스터마이징

### package.json 설정

```json
{
  "build": {
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "category": "public.app-category.productivity",
      "icon": "icon.png"
    }
  }
}
```

### 아이콘 설정

- **위치**: 프로젝트 루트의 `icon.png`
- **크기**: 512x512 픽셀 권장
- **형식**: PNG
- electron-builder가 자동으로 `.icns` 파일로 변환합니다

## 배포

### DMG 파일 배포
1. DMG 파일을 공유
2. 사용자가 다운로드하여 마운트
3. 앱을 Applications 폴더로 드래그

### ZIP 파일 배포
1. ZIP 파일을 공유
2. 사용자가 다운로드하여 압축 해제
3. 앱을 Applications 폴더로 이동

## 참고사항

- **아키텍처**: Intel (x64) 및 Apple Silicon (arm64) 모두 지원
- **최소 macOS 버전**: macOS 10.13 (High Sierra) 이상
- **권장 macOS 버전**: macOS 11 (Big Sur) 이상
- **빌드 시간**: 약 5-10분 (네트워크 상태에 따라 다름)

## 추가 리소스

- [Electron Builder 문서](https://www.electron.build/)
- [macOS 코드 서명 가이드](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Apple Developer 문서](https://developer.apple.com/documentation/)

