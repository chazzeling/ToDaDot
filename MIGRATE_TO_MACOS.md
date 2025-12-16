# macOS로 프로젝트 옮기기 가이드

## 방법 1: 전체 폴더 옮기기 (간단)

### 1. 폴더 복사/이동
- Windows: `C:\Users\let09\Desktop\ToDaDot` 폴더 전체를
- macOS: 원하는 위치로 복사 (예: `~/Desktop/ToDaDot`)

### 2. macOS에서 의존성 재설치
```bash
cd ~/Desktop/ToDaDot
rm -rf node_modules
npm install
```

### 3. 네이티브 모듈 재빌드
```bash
npm run rebuild
```

### 4. 빌드 실행
```bash
npm run build:mac:dmg
```

## 방법 2: Git 사용 (권장)

### 1. Windows에서 Git 커밋 (변경사항이 있다면)
```bash
git add .
git commit -m "Prepare for macOS build"
git push
```

### 2. macOS에서 클론
```bash
cd ~/Desktop
git clone <your-repo-url> ToDaDot
cd ToDaDot
```

### 3. 의존성 설치
```bash
npm install
npm run rebuild
```

### 4. 빌드 실행
```bash
npm run build:mac:dmg
```

## 방법 3: 필수 파일만 옮기기 (가장 깔끔)

### 옮기지 않아도 되는 폴더/파일
- `node_modules/` - 재설치 가능
- `dist/` - 재빌드 가능
- `dist-electron/` - 재빌드 가능
- `release/` - 재빌드 가능
- `.DS_Store` - macOS에서 자동 생성
- `debug_*.txt` - 로그 파일

### 반드시 옮겨야 하는 파일/폴더
- `src/` - 소스 코드
- `electron/` - Electron 소스 코드
- `public/` - 공용 리소스
- `build/` - 빌드 설정
- `scripts/` - 빌드 스크립트
- `package.json` - 프로젝트 설정
- `package-lock.json` - 의존성 버전 고정
- `tsconfig.json`, `tsconfig.node.json` - TypeScript 설정
- `vite.config.ts` - Vite 설정
- `index.html` - HTML 엔트리
- `icon.png` - 앱 아이콘
- `.git/` - Git 저장소 (있는 경우)
- `.env` - 환경 변수 (있는 경우, 보안 주의)
- `docs/` - 문서 (선택사항)
- `*.md` - 마크다운 문서 (선택사항)

## macOS에서 해야 할 일

### 1. 사전 준비
```bash
# Xcode Command Line Tools 설치 확인
xcode-select --print-path

# 없으면 설치
xcode-select --install
```

### 2. Node.js 확인
```bash
node --version  # v20 이상 권장
npm --version
```

### 3. 프로젝트 폴더로 이동
```bash
cd ~/Desktop/ToDaDot  # 또는 옮긴 위치
```

### 4. 의존성 설치
```bash
npm install
```

### 5. 네이티브 모듈 재빌드
```bash
npm run rebuild
```

### 6. 빌드 실행
```bash
# DMG 파일 생성
npm run build:mac:dmg

# 또는 ZIP 파일 생성
npm run build:mac:zip

# 또는 전체 빌드
npm run build:mac
```

## 빌드 결과물 위치

빌드 완료 후:
```
release/
  ├── ToDaDot-1.1.0-beta.dmg      # DMG 설치 파일
  ├── ToDaDot-1.1.0-beta-mac.zip  # ZIP 압축 파일
  └── mac/
      └── ToDaDot.app             # 앱 번들
```

## 문제 해결

### 1. 의존성 설치 실패
```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. 네이티브 모듈 빌드 오류
```bash
npm run rebuild
```

### 3. 권한 오류
```bash
chmod +x electron/build.sh
```

### 4. Python 오류 (better-sqlite3 빌드 시)
```bash
# Homebrew로 Python 설치
brew install python
```

## 주의사항

1. **환경 변수 파일 (.env)**
   - `.env` 파일이 있다면 함께 옮겨야 합니다
   - 보안을 위해 Git에 커밋하지 마세요

2. **node_modules 크기**
   - `node_modules` 폴더는 매우 큽니다 (수백 MB)
   - 옮기지 않고 macOS에서 재설치하는 것이 더 빠를 수 있습니다

3. **경로 구분자**
   - Windows: `\`
   - macOS: `/`
   - JavaScript 코드는 자동으로 처리되지만, 스크립트 파일은 확인 필요

4. **실행 권한**
   - `electron/build.sh` 파일에 실행 권한이 필요할 수 있습니다
   ```bash
   chmod +x electron/build.sh
   ```

## 빠른 체크리스트

- [ ] 폴더를 macOS로 옮김
- [ ] Xcode Command Line Tools 설치 확인
- [ ] Node.js 설치 확인 (v20 이상)
- [ ] `npm install` 실행
- [ ] `npm run rebuild` 실행
- [ ] `npm run build:mac:dmg` 실행
- [ ] `release/` 폴더에서 결과물 확인

