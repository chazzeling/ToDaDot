# GitHub Actions를 사용한 macOS 빌드 빠른 시작 가이드

## 🚀 빠른 시작

### 1단계: GitHub에 코드 푸시

```bash
git add .
git commit -m "Add GitHub Actions for macOS build"
git push origin main
```

### 2단계: 빌드 실행

#### 방법 A: 수동 실행 (권장 - 첫 테스트)

1. GitHub 저장소 웹사이트로 이동
2. **Actions** 탭 클릭
3. **Build and Release** 워크플로우 선택
4. **Run workflow** 버튼 클릭
5. 플랫폼 선택:
   - `mac`: macOS만 빌드 (빠름, 약 10-15분)
   - `all`: 모든 플랫폼 빌드 (느림, 약 20-25분)
6. **Run workflow** 클릭

#### 방법 B: 태그를 통한 자동 빌드

```bash
# 버전 태그 생성
git tag v1.0.0

# 태그 푸시 (자동으로 빌드 시작)
git push origin v1.0.0
```

### 3단계: 빌드 결과 다운로드

1. **Actions** 탭에서 실행 중인 워크플로우 클릭
2. 빌드 완료 대기 (약 10-15분)
3. **macos-build** Artifacts 섹션에서 다운로드
4. 다운로드한 `.dmg` 파일 실행

## 📦 빌드 결과물

빌드가 완료되면 다음 파일들이 생성됩니다:

- **ToDaDot-1.0.0.dmg**: macOS 설치 파일 (DMG)
- **ToDaDot-1.0.0-mac.zip**: 압축 파일 (x64 + arm64 포함)

## ⚙️ 설정 (선택사항)

### 코드 서명 설정

코드 서명을 사용하려면:

1. **Apple Developer 계정** 필요 (유료, 연간 $99)
2. GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**
3. 다음 Secrets 추가:
   - `APPLE_ID`: Apple ID 이메일
   - `APPLE_APP_SPECIFIC_PASSWORD`: App-Specific Password
   - `APPLE_TEAM_ID`: Team ID

**참고**: 코드 서명 없이도 빌드 및 배포 가능합니다. 사용자는 "보안 설정"에서 앱 실행을 허용해야 합니다.

## 🔍 빌드 상태 확인

### 실시간 로그 확인

1. **Actions** 탭 → 실행 중인 워크플로우
2. **build-mac** Job 클릭
3. 각 Step의 로그 확인

### 빌드 시간

- **첫 빌드**: 15-20분 (의존성 다운로드 포함)
- **이후 빌드**: 10-15분 (캐시 사용)

## ❌ 문제 해결

### 빌드 실패 시

1. **로그 확인**
   - 실패한 Step의 로그를 자세히 확인
   - 빨간색 ❌ 표시가 있는 부분 확인

2. **일반적인 문제**

   **의존성 오류**
   ```bash
   # 로컬에서 테스트
   npm ci
   npm run electron:build:main
   npm run build
   ```

   **빌드 스크립트 오류**
   - `electron/build.sh` 파일이 실행 가능한지 확인
   - 파일 권한: `chmod +x electron/build.sh`

   **Node.js 버전**
   - GitHub Actions는 Node.js 20 사용
   - 로컬에서도 Node.js 20 권장

3. **로컬 테스트**

   macOS가 있다면 로컬에서 먼저 테스트:

   ```bash
   npm ci
   npm run electron:build:main
   npm run build
   npx electron-builder --mac --x64 --arm64
   ```

## 📝 GitHub Releases 자동 생성

태그를 통한 빌드의 경우, 빌드가 완료되면 자동으로 GitHub Releases가 생성됩니다:

1. **Releases** 탭에서 확인
2. 다운로드 링크 자동 생성
3. 릴리스 노트 작성 가능

## 🎯 다음 단계

1. ✅ 빌드 성공 확인
2. ✅ `.dmg` 파일 다운로드
3. ✅ macOS에서 테스트 설치
4. ✅ 앱 실행 테스트
5. ✅ GitHub Releases에 릴리스 노트 추가

## 📚 추가 리소스

- [전체 가이드](./MACOS_BUILD_GUIDE.md)
- [배포 가이드](../DEPLOYMENT.md)
- [빌드 가이드](../BUILD_GUIDE.md)





