# 재부팅 후 설치 가이드

## 재부팅 후 수행할 단계

### 1. PowerShell 관리자 권한으로 실행
- Windows 키 + X
- "Windows PowerShell (관리자)" 선택

### 2. 프로젝트 폴더로 이동
```powershell
cd C:\Users\let09\Desktop\ToDaDot
```

### 3. 잔여 폴더 삭제
```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Programs\ToDaDot" -ErrorAction SilentlyContinue
```

### 4. 설치 파일 실행
```powershell
Start-Process "release\ToDaDot Setup 1.0.0.exe" -Verb RunAs
```

### 5. 설치 마법사 진행
- 화면의 안내에 따라 설치 진행
- 설치 경로는 기본값 사용 권장

### 6. 앱 실행 테스트
- 설치 완료 후 앱 실행
- UI가 정상적으로 표시되는지 확인

## 확인 사항

설치 후 다음을 확인하세요:

1. **앱 실행 경로**
   ```
   C:\Users\let09\AppData\Local\Programs\ToDaDot\ToDaDot.exe
   ```

2. **정상 작동 확인**
   - 앱이 정상적으로 시작되는가?
   - UI가 표시되는가?
   - 에러 메시지가 없는가?

3. **콘솔 로그 확인** (선택사항)
   - 앱 실행 시 콘솔에 다음 메시지가 있는지 확인:
     - `📄 Loading HTML file from: ...`
     - `app.getAppPath(): ...`
     - `app.isPackaged: true`

## 문제 해결

만약 여전히 문제가 발생한다면:

1. **설치 폴더 확인**
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Programs\ToDaDot" -Recurse | Select-Object FullName
   ```

2. **로그 파일 확인**
   ```powershell
   Get-Content "$env:LOCALAPPDATA\Programs\ToDaDot\debug.log" -ErrorAction SilentlyContinue
   ```

3. **프로세스 확인**
   ```powershell
   Get-Process | Where-Object { $_.ProcessName -like "*ToDaDot*" }
   ```





