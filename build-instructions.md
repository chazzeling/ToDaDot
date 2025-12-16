# ToDaDot 포터블 버전 빌드 가이드

## 빌드 전 준비사항

### 1. 버전 확인
- 현재 버전: **1.1.0-beta**
- `package.json`의 `version` 필드 확인

### 2. 데이터 초기화
빌드 전에 개발 환경의 사용자 데이터를 초기화합니다:
```bash
npm run prebuild:clean
```

이 스크립트는 다음을 삭제합니다:
- SQLite 데이터베이스 파일 (`todadot.db`)
- Google OAuth 토큰 파일
- Firebase 토큰 파일
- 스티커 이미지 폴더

## 빌드 실행

### 포터블 버전 빌드
```bash
npm run build:portable
```

이 명령어는 다음을 순차적으로 실행합니다:
1. `prebuild:clean` - 데이터 초기화
2. `electron:build:main` - Electron 메인 프로세스 빌드
3. `vite build` - React 앱 빌드
4. `electron-builder --win portable` - 포터블 실행 파일 생성

### 빌드 결과물
- **위치**: `release/` 폴더
- **파일명**: `ToDaDot-1.1.0-beta-portable.exe`
- **형태**: 단일 실행 파일 (설치 불필요)

## 빌드 설정 확인

### 포함되는 파일
- `dist/**/*` - React 앱 빌드 결과물
- `dist-electron/**/*` - Electron 메인 프로세스 빌드 결과물
- `package.json` - 패키지 정보

### 제외되는 파일 (자동)
electron-builder가 자동으로 다음을 제외합니다:
- `src/` - 소스 코드
- `electron/` - Electron 소스 코드
- `docs/` - 문서 파일
- `*.md` - 마크다운 파일
- `*.txt` - 텍스트 파일
- `tsconfig*.json` - TypeScript 설정
- `vite.config.*` - Vite 설정
- `.git/` - Git 폴더
- `.vscode/`, `.idea/` - IDE 설정
- `node_modules/` - 의존성 (필요한 것만 자동 포함)
- 기타 개발 파일

### ASAR 압축
- 모든 앱 파일은 `.asar` 아카이브로 압축됩니다
- 소스 코드가 노출되지 않도록 보호됩니다
- **중요**: `better-sqlite3` 같은 네이티브 모듈은 `asarUnpack`에 포함되어 ASAR 밖에 배치됩니다

## 배포

### 최종 배포 파일
1. **단일 실행 파일**: `ToDaDot-1.1.0-beta-portable.exe`
   - 압축 해제 없이 바로 실행 가능
   - USB나 다른 위치에 복사하여 사용 가능

2. **ZIP 압축 (선택사항)**
   - 실행 파일을 ZIP으로 압축하여 배포 가능
   - 사용자가 압축 해제 후 실행

### 배포 전 확인사항
- [ ] 버전이 1.1.0-beta로 설정되어 있는지 확인
- [ ] 빌드 전 데이터 초기화 완료
- [ ] 실행 파일이 정상 작동하는지 테스트
- [ ] 소스 코드가 포함되지 않았는지 확인
- [ ] 문서 파일이 포함되지 않았는지 확인

## 문제 해결

### 빌드 실패 시
1. `node_modules` 삭제 후 재설치:
   ```bash
   rm -rf node_modules
   npm install
   ```

2. 빌드 캐시 삭제:
   ```bash
   rm -rf dist dist-electron release
   ```

3. Electron 재빌드 (네이티브 모듈 재컴파일):
   ```bash
   npm run rebuild
   ```
   
   **중요**: `better-sqlite3`는 네이티브 모듈이므로 Electron 버전에 맞게 재빌드되어야 합니다.

4. 완전한 재빌드:
   ```bash
   # 모든 빌드 결과물 삭제
   rm -rf dist dist-electron release node_modules
   
   # 의존성 재설치 및 재빌드
   npm install
   npm run rebuild
   npm run build:portable
   ```

### 포터블 파일이 실행되지 않는 경우 ("지원하지 않는 포맷" 오류)

**원인**: 
- 네이티브 모듈(better-sqlite3)이 Electron 버전과 맞지 않음
- 빌드 과정에서 네이티브 모듈이 제대로 포함되지 않음

**해결 방법**:

1. **네이티브 모듈 재빌드**:
   ```bash
   npm run rebuild
   ```

2. **완전한 재빌드**:
   ```bash
   rm -rf dist dist-electron release
   npm run prebuild:clean
   npm run electron:build:main
   npm run build:portable
   ```

3. **테스트 환경 확인**:
   - 빌드한 머신과 동일한 OS 아키텍처(x64)에서 테스트
   - Windows 10 이상에서 테스트

4. **의존성 재설치**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run rebuild
   npm run build:portable
   ```

### 실행 파일 크기 확인
- 포터블 버전은 일반적으로 100-200MB 정도입니다
- 크기가 비정상적으로 크면 불필요한 파일이 포함된 것일 수 있습니다

## 참고사항

- 포터블 버전은 설치 없이 바로 실행 가능합니다
- 사용자 데이터는 실행 파일과 같은 위치에 저장됩니다
- 여러 위치에 복사하여 사용할 수 있습니다
- 각 복사본은 독립적인 데이터를 가집니다

