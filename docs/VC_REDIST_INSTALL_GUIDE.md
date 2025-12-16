# Visual C++ Redistributable 자동 포함 가이드

## 문제 해결 확인

Visual C++ Redistributable 설치 후 앱이 정상적으로 실행되는지 확인되었습니다.

## NSIS 설치 파일에 자동 포함 방법

### 방법 1: extraFiles 사용 (권장)

`package.json`의 `build.win` 섹션에 다음을 추가:

```json
{
  "build": {
    "win": {
      "extraFiles": [
        {
          "from": "build/vc_redist.x64.exe",
          "to": ".",
          "filter": ["**/*"]
        }
      ]
    },
    "nsis": {
      "include": "build/installer.nsh"
    }
  }
}
```

### 방법 2: NSIS 스크립트에서 자동 설치

`build/installer.nsh` 파일 생성:

```nsis
; Visual C++ Redistributable 자동 설치
!macro InstallVCRedist
  ; 레지스트리에서 확인
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  ${If} $0 == ""
    ; 설치되지 않은 경우
    File "vc_redist.x64.exe"
    ExecWait '"$INSTDIR\vc_redist.x64.exe" /install /quiet /norestart'
    Delete "$INSTDIR\vc_redist.x64.exe"
  ${EndIf}
!macroend

Function .onInit
  !insertmacro InstallVCRedist
FunctionEnd
```

### 방법 3: 설치 전 확인 및 안내 (가장 간단)

NSIS 스크립트에서 레지스트리 확인 후 없으면 안내:

```nsis
Function .onInit
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  ${If} $0 == ""
    MessageBox MB_YESNO|MB_ICONQUESTION "Visual C++ Redistributable이 필요합니다.$\n$\n다음 링크에서 다운로드하세요:$\nhttps://aka.ms/vs/17/release/vc_redist.x64.exe$\n$\n계속하시겠습니까?" IDYES continue IDNO cancel
    cancel:
      Abort
    continue:
  ${EndIf}
FunctionEnd
```

## 권장 방법

**방법 3 (설치 전 확인 및 안내)**을 권장합니다:
- 설치 파일 크기 증가 없음
- 사용자가 최신 버전 설치 가능
- 구현이 간단함

## 구현 단계

1. `build/installer.nsh` 파일 생성
2. `package.json`의 `nsis.include` 설정
3. 재빌드 및 테스트




