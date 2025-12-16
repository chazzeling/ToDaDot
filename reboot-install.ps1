# 재부팅 후 설치 스크립트
# 관리자 권한으로 실행하세요

Write-Host '=== 재부팅 후 설치 시작 ==='

# 1. 잔여 폴더 삭제
Write-Host '
1. 잔여 폴더 삭제 중...'
$appPath = "$env:LOCALAPPDATA\Programs\ToDaDot"
if (Test-Path $appPath) {
    Remove-Item -Recurse -Force $appPath -ErrorAction SilentlyContinue
    Write-Host '    폴더 삭제 완료'
} else {
    Write-Host '    폴더가 이미 없음'
}

# 2. 설치 파일 실행
Write-Host '
2. 설치 파일 실행 중...'
$installerPath = "C:\Users\let09\Desktop\todadat\release\ToDaDot Setup 1.0.0.exe"
if (Test-Path $installerPath) {
    Start-Process $installerPath -Verb RunAs
    Write-Host '    설치 프로그램 실행됨'
} else {
    Write-Host '    설치 파일을 찾을 수 없습니다: $installerPath'
}

Write-Host '
=== 완료 ==='
Write-Host '설치 마법사에서 안내에 따라 진행하세요.'
