# macOS CI/CD 전환 가이드

## Windows 배포 완료 선언

### ✅ 완료된 작업

1. **app.asar 경로 문제 해결**
   - `app.getAppPath()` 사용
   - `fs.existsSync()` 체크 제거

2. **코드 서명 문제 해결**
   - 코드 서명 비활성화 설정

3. **Visual C++ Redistributable 의존성 확인**
   - 원인 파악 완료
   - 사용자 안내 문서 작성

### 최종 Windows 배포 파일

- **파일명**: `ToDaDot Setup 1.0.0.exe`
- **경로**: `release\ToDaDot Setup 1.0.0.exe`
- **크기**: 약 120 MB

### 사용자 안내

Visual C++ Redistributable 수동 설치 필요:
- 다운로드: https://aka.ms/vs/17/release/vc_redist.x64.exe

## macOS CI/CD 전환

### 현재 상태

✅ **GitHub Actions 워크플로우 설정 완료**
- `.github/workflows/build.yml` 파일 존재
- macOS 빌드 Job 설정 완료
- Windows 빌드 Job 설정 완료

✅ **크로스 플랫폼 빌드 스크립트 준비**
- `electron/build.sh` (macOS/Linux용)
- `electron/build.ps1` (Windows용)
- `package.json`에서 자동 선택

### 다음 단계

#### 1. GitHub에 코드 푸시

```bash
git add .
git commit -m "Complete Windows deployment and add macOS CI/CD support"
git push origin main
```

#### 2. GitHub Actions 활성화

1. GitHub 저장소 → **Settings** → **Actions** → **General**
2. "Allow all actions and reusable workflows" 선택
3. 저장

#### 3. 첫 macOS 빌드 실행

1. GitHub 저장소 → **Actions** 탭
2. **Build and Release** 워크플로우 선택
3. **Run workflow** 버튼 클릭
4. 플랫폼 선택: `mac`
5. **Run workflow** 클릭

#### 4. 빌드 결과 확인

- 빌드 완료 후 **macos-build** Artifacts에서 다운로드
- `ToDaDot-1.0.0.dmg` 파일 확인
- `ToDaDot-1.0.0-mac.zip` 파일 확인

### 빌드 시간

- **macOS 빌드**: 약 10-15분
- **전체 빌드 (Windows + macOS)**: 약 20-25분

### 코드 서명 (선택사항)

Apple Developer 계정이 있다면:
1. GitHub Secrets에 추가:
   - `APPLE_ID`
   - `APPLE_APP_SPECIFIC_PASSWORD`
   - `APPLE_TEAM_ID`
2. 코드 서명 자동 적용

### 배포 워크플로우

#### 자동 빌드 (태그 사용)

```bash
git tag v1.0.0
git push origin v1.0.0
```

태그 푸시 시:
- Windows와 macOS 모두 자동 빌드
- GitHub Releases에 자동 업로드

#### 수동 빌드

GitHub Actions → Run workflow → 플랫폼 선택

### 테스트 체크리스트

- [ ] GitHub에 코드 푸시
- [ ] GitHub Actions 활성화
- [ ] 첫 macOS 빌드 실행
- [ ] 빌드 성공 확인
- [ ] DMG 파일 다운로드
- [ ] DMG 파일 테스트 (macOS에서)
- [ ] 앱 정상 실행 확인

### 문제 해결

#### 빌드 실패 시

1. **로그 확인**
   - GitHub Actions → 실행된 워크플로우
   - 실패한 Step의 로그 확인

2. **일반적인 문제**
   - Node.js 버전 확인 (v20 권장)
   - 의존성 문제: `npm ci` 확인
   - 빌드 스크립트 권한 문제

3. **로컬 테스트** (macOS가 있는 경우)
   ```bash
   npm ci
   npm run electron:build:main
   npm run build
   npx electron-builder --mac --x64 --arm64
   ```

## 배포 준비 상태

### Windows
- ✅ 설치 파일 생성 완료
- ✅ 경로 문제 해결
- ✅ 사용자 안내 문서 작성

### macOS
- ✅ CI/CD 워크플로우 설정 완료
- ✅ 빌드 스크립트 준비 완료
- ⏳ 첫 빌드 실행 대기

## 다음 단계

1. **GitHub에 코드 푸시**
2. **GitHub Actions에서 첫 빌드 실행**
3. **빌드 성공 확인**
4. **DMG 파일 테스트**
5. **배포 준비 완료**
