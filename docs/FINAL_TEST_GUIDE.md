# 최종 배포 테스트 가이드

## 테스트 환경 준비

### 옵션 1: 가상 머신 사용 (권장)
- Windows 가상 머신 생성
- Visual C++ Redistributable이 설치되지 않은 상태로 시작

### 옵션 2: 현재 PC에서 테스트
- Visual C++ Redistributable 제거 (선택사항)
- 또는 새 사용자 계정에서 테스트

## 테스트 시나리오

### 1단계: 설치 파일 실행 (VC++ 없이)

1. **설치 파일 실행**
   ```
   release\ToDaDot Setup 1.0.0.exe
   ```

2. **설치 완료**
   - 설치 마법사에서 안내에 따라 진행
   - 설치 경로: `C:\Users\[사용자명]\AppData\Local\Programs\ToDaDot`

3. **예상 결과**
   - 설치 자체는 성공할 것
   - 하지만 앱 실행 시 문제 발생 예상

### 2단계: 앱 실행 시도 (VC++ 없이)

1. **앱 실행**
   ```
   C:\Users\[사용자명]\AppData\Local\Programs\ToDaDot\ToDaDot.exe
   ```

2. **예상 동작**
   - 앱이 실행되지 않음
   - 또는 즉시 종료됨
   - 오류 메시지 없이 종료될 수 있음

3. **확인 사항**
   - Windows 이벤트 로그 확인
   - 이벤트 뷰어 → Windows 로그 → 응용 프로그램
   - ToDaDot.exe 관련 오류 검색

### 3단계: Visual C++ Redistributable 설치

1. **다운로드**
   - 링크: https://aka.ms/vs/17/release/vc_redist.x64.exe
   - 또는 PowerShell로 다운로드:
     ```powershell
     Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vc_redist.x64.exe" -OutFile "$env:TEMP\vc_redist.x64.exe"
     ```

2. **설치**
   - 다운로드한 파일 실행
   - 설치 완료

3. **설치 확인**
   ```powershell
   Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" -ErrorAction SilentlyContinue
   ```

### 4단계: 앱 재실행 (VC++ 설치 후)

1. **앱 실행**
   ```
   C:\Users\[사용자명]\AppData\Local\Programs\ToDaDot\ToDaDot.exe
   ```

2. **예상 결과**
   - ✅ 앱이 정상적으로 시작됨
   - ✅ UI가 표시됨
   - ✅ 에러 없이 작동

3. **확인 사항**
   - 앱 창이 열리는가?
   - UI가 정상적으로 표시되는가?
   - 콘솔 로그에 다음 메시지가 있는가?
     - `📄 Loading HTML file from: ...`
     - `app.getAppPath(): ...`
     - `app.isPackaged: true`

## 테스트 체크리스트

### 설치 단계
- [ ] 설치 파일 실행 성공
- [ ] 설치 마법사 정상 작동
- [ ] 설치 경로 선택 가능
- [ ] 설치 완료

### VC++ 없이 실행
- [ ] 앱 실행 시도
- [ ] 실행 실패 또는 즉시 종료 확인
- [ ] Windows 이벤트 로그에 오류 기록 확인

### VC++ 설치 후
- [ ] Visual C++ Redistributable 설치 완료
- [ ] 앱 정상 실행
- [ ] UI 정상 표시
- [ ] 에러 없이 작동

## 테스트 결과 보고

테스트 완료 후 다음 정보를 기록하세요:

1. **테스트 환경**
   - OS 버전
   - Visual C++ Redistributable 설치 여부 (초기 상태)

2. **설치 결과**
   - 설치 성공 여부
   - 설치 경로

3. **VC++ 없이 실행 결과**
   - 앱 실행 여부
   - 오류 메시지 (있는 경우)
   - Windows 이벤트 로그 내용

4. **VC++ 설치 후 실행 결과**
   - 앱 실행 성공 여부
   - UI 표시 여부
   - 정상 작동 여부

## 배포 준비

모든 테스트가 성공하면:
- ✅ 최종 배포 파일: `release\ToDaDot Setup 1.0.0.exe`
- ✅ 사용자 안내: Visual C++ Redistributable 설치 필요
- ✅ 배포 준비 완료




