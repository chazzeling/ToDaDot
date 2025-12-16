; Visual C++ Redistributable 자동 설치 로직
; electron-builder NSIS 스크립트에 포함됨

Section "InstallVC++"
  ; VC++ 설치 여부 확인
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  
  ; 이미 설치되어 있으면 건너뛰기
  StrCmp $0 "" 0 vc_installed
  
  ; VC++ 설치 파일 경로 확인
  ; electron-builder의 extraFiles로 포함된 경우를 고려
  ; 여러 가능한 경로 확인
  StrCpy $1 "$EXEDIR\vc_redist.x64.exe"
  IfFileExists "$1" 0 check_resources
  
  ; 설치 파일이 EXEDIR에 있는 경우
  MessageBox MB_OK "앱 실행을 위해 Visual C++ Redistributable을 설치합니다."
  ExecWait '"$1" /install /quiet /norestart'
  Goto cleanup
  
  check_resources:
  ; resources 폴더 확인
  StrCpy $1 "$EXEDIR\resources\vc_redist.x64.exe"
  IfFileExists "$1" 0 check_appdir
  
  MessageBox MB_OK "앱 실행을 위해 Visual C++ Redistributable을 설치합니다."
  ExecWait '"$1" /install /quiet /norestart'
  Goto cleanup
  
  check_appdir:
  ; 앱 설치 디렉토리 확인
  StrCpy $1 "$INSTDIR\resources\vc_redist.x64.exe"
  IfFileExists "$1" 0 vc_installed
  
  MessageBox MB_OK "앱 실행을 위해 Visual C++ Redistributable을 설치합니다."
  ExecWait '"$1" /install /quiet /norestart'
  Goto cleanup
  
  cleanup:
  ; 임시 파일 삭제 (필요한 경우)
  ; Delete "$1"
  
  vc_installed:
SectionEnd




