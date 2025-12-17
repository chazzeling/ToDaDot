# 포터블 버전 배포 가이드

## Visual C++ Redistributable 자동 설치 확인

### 현재 구현 상태

포터블 버전(`ToDaDot-1.2.0-beta-portable.exe`)은 **Visual C++ Redistributable 자동 설치 기능**을 포함하고 있습니다.

### 작동 방식

1. **앱 시작 시 자동 확인**
   - 앱이 실행되면 자동으로 시스템에 Visual C++ Redistributable이 설치되어 있는지 확인합니다.
   - 레지스트리를 통해 설치 여부를 확인합니다.

2. **자동 설치**
   - Visual C++ Redistributable이 설치되어 있지 않으면, 포터블 실행 파일과 함께 포함된 `vc_redist.x64.exe`를 자동으로 실행하여 설치합니다.
   - 설치 과정은 백그라운드에서 진행되며, 사용자 개입이 필요 없습니다.

3. **파일 위치**
   - 포터블 버전의 경우, `vc_redist.x64.exe`는 실행 파일과 같은 디렉토리에 포함됩니다.
   - 앱은 다음 경로에서 VC++ Redistributable 설치 파일을 찾습니다:
     - `process.resourcesPath/vc_redist.x64.exe` (설치 버전)
     - `실행파일디렉토리/vc_redist.x64.exe` (포터블 버전)

### 배포 시 포함되는 파일

포터블 버전을 배포할 때는 다음 파일만 배포하면 됩니다:

- ✅ **`ToDaDot-1.2.0-beta-portable.exe`** (단일 실행 파일)
  - 이 파일 하나만 배포하면 됩니다.
  - VC++ Redistributable 설치 파일은 실행 파일 내부에 포함되어 있습니다.

### 사용자 안내 (선택사항)

대부분의 경우 자동 설치가 작동하지만, 만약 사용자가 VC++ Redistributable 설치에 문제가 있는 경우를 대비하여 다음 안내를 제공할 수 있습니다:

```
ToDaDot 포터블 버전을 실행하려면 Visual C++ Redistributable이 필요합니다.
앱이 자동으로 설치를 시도하지만, 문제가 발생하는 경우:
1. Microsoft 공식 사이트에서 Visual C++ 2015-2022 Redistributable (x64)를 다운로드하여 설치하세요.
2. 또는 관리자 권한으로 앱을 실행해보세요.
```

### 테스트 방법

포터블 버전이 VC++ Redistributable 없이도 작동하는지 테스트하려면:

1. **VC++ Redistributable 제거** (테스트용)
   - 제어판 > 프로그램 및 기능에서 Visual C++ Redistributable 제거
   - 또는 레지스트리에서 확인: `HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64`

2. **포터블 버전 실행**
   - `ToDaDot-1.2.0-beta-portable.exe` 실행
   - 콘솔 로그에서 "Visual C++ Redistributable 설치 중..." 메시지 확인
   - 앱이 정상적으로 실행되는지 확인

3. **설치 확인**
   - 레지스트리에서 VC++ Redistributable이 설치되었는지 확인

### 주의사항

- 포터블 버전은 **단일 실행 파일**로 배포되지만, 첫 실행 시 VC++ Redistributable 설치를 위해 임시 파일이 생성될 수 있습니다.
- VC++ Redistributable 설치에는 관리자 권한이 필요할 수 있습니다. 사용자가 관리자 권한 없이 실행하는 경우, 설치가 실패할 수 있습니다.
- 설치 실패 시에도 앱은 계속 실행을 시도하지만, `better-sqlite3` 같은 네이티브 모듈이 제대로 작동하지 않을 수 있습니다.

### 결론

**포터블 버전은 `ToDaDot-1.2.0-beta-portable.exe` 파일 하나만 배포하면 됩니다.**

VC++ Redistributable 자동 설치 기능이 포함되어 있어, 대부분의 경우 사용자가 별도로 설치할 필요가 없습니다. 다만, 관리자 권한이 필요한 경우나 특수한 환경에서는 수동 설치가 필요할 수 있습니다.

