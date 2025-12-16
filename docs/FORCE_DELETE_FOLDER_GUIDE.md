# ToDaDot 폴더 강제 삭제 가이드

## 상황
Windows 탐색기에서 폴더 삭제 시 오류 0x80004005가 발생하는 경우

## 해결 방법

### 방법 1: 관리자 권한 PowerShell 사용 (권장)

1. **관리자 권한으로 PowerShell 실행**
   - Windows 키 누르기
   - "PowerShell" 입력
   - "Windows PowerShell" 우클릭 → "관리자 권한으로 실행"

2. **다음 명령어 실행**:
```powershell
# 프로세스 강제 종료
taskkill /IM ToDaDot.exe /F

# 잠시 대기
Start-Sleep -Seconds 3

# 폴더 삭제
$folderPath = "C:\Users\let09\AppData\Local\Programs\ToDaDot"
if (Test-Path $folderPath) {
    Remove-Item -Path $folderPath -Recurse -Force
    Write-Host "폴더 삭제 완료!"
} else {
    Write-Host "폴더가 이미 삭제되었습니다."
}
```

### 방법 2: takeown 및 icacls 사용 (더 강력)

관리자 권한 PowerShell에서:
```powershell
$folderPath = "C:\Users\let09\AppData\Local\Programs\ToDaDot"

# 소유권 획득
takeown /F "$folderPath" /R /D Y

# 권한 부여
icacls "$folderPath" /grant "${env:USERNAME}:F" /T

# 폴더 삭제
Remove-Item -Path $folderPath -Recurse -Force
```

### 방법 3: 재부팅 후 삭제 (최후의 수단)

1. **컴퓨터 재부팅**
2. **재부팅 후 즉시 폴더 삭제 시도**
   - 재부팅하면 모든 프로세스가 종료되므로 파일 잠금이 해제됩니다.

### 방법 4: Unlocker 같은 도구 사용

- Unlocker 같은 파일 잠금 해제 도구를 사용하여 폴더 삭제

## 확인 사항

삭제 후 다음 명령어로 확인:
```powershell
Test-Path "C:\Users\let09\AppData\Local\Programs\ToDaDot"
```

`False`가 반환되면 삭제 성공입니다.

## 다음 단계

폴더 삭제가 완료되면:
1. 새로 생성된 설치 파일 실행: `release\ToDaDot Setup 1.0.0.exe`
2. 깨끗한 환경에서 재설치
3. 앱 실행 테스트




