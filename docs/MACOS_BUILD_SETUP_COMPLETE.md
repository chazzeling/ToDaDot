# macOS 빌드 설정 완료 ✅

## 생성된 파일

1. **`.github/workflows/build.yml`**
   - GitHub Actions 워크플로우 파일
   - macOS 및 Windows 자동 빌드 설정

2. **`electron/build.sh`**
   - macOS/Linux용 크로스 플랫폼 빌드 스크립트
   - Windows용 `build.ps1`과 동일한 기능

3. **`docs/MACOS_BUILD_GUIDE.md`**
   - 상세한 macOS 빌드 가이드

4. **`docs/MACOS_BUILD_QUICKSTART.md`**
   - 빠른 시작 가이드

## 다음 단계

### 1. GitHub에 푸시

```bash
git add .
git commit -m "Add GitHub Actions for macOS build"
git push origin main
```

### 2. 첫 빌드 실행

1. GitHub 저장소 → **Actions** 탭
2. **Build and Release** 워크플로우 선택
3. **Run workflow** → 플랫폼 선택 (`mac` 또는 `all`)
4. **Run workflow** 클릭

### 3. 빌드 결과 확인

- 빌드 완료 후 **Artifacts**에서 `.dmg` 파일 다운로드
- 태그를 사용한 경우 **Releases** 탭에서 확인

## 주요 기능

✅ **자동 빌드**: 태그 푸시 시 자동 빌드  
✅ **수동 빌드**: 워크플로우 디스패치로 수동 실행  
✅ **크로스 플랫폼**: Windows와 macOS 모두 지원  
✅ **자동 릴리스**: 태그 빌드 시 GitHub Releases 자동 생성  
✅ **코드 서명**: 선택적 Apple 코드 서명 지원  

## 참고사항

- **빌드 시간**: macOS 빌드는 약 10-15분 소요
- **무료 한도**: Public 저장소는 무제한, Private는 월 2,000분
- **코드 서명**: 없이도 빌드 가능 (사용자가 보안 설정에서 허용 필요)





