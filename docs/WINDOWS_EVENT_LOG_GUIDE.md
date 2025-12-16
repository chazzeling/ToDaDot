# Windows 이벤트 로그 확인 가이드

## 이벤트 뷰어에서 ToDaDot.exe 오류 확인 방법

### 1. 이벤트 뷰어 열기
1. `Win + X` 키 누르기
2. "이벤트 뷰어" 선택
3. 또는 `eventvwr.msc` 실행

### 2. Application Error 이벤트 확인
1. 왼쪽 패널: **Windows 로그** → **응용 프로그램**
2. 오른쪽 패널: **현재 로그 필터링** 클릭
3. **이벤트 수준**: "오류" 선택
4. **이벤트 ID**: `1000`, `1001` 입력
5. **확인** 클릭

### 3. ToDaDot.exe 관련 오류 찾기
- 필터링된 목록에서 "ToDaDot.exe" 또는 "todadot" 검색
- 각 오류를 클릭하여 상세 정보 확인

### 4. 확인해야 할 핵심 정보
- **Faulting application**: ToDaDot.exe
- **Faulting module name**: (예: vcruntime140.dll, ntdll.dll 등)
- **Exception code**: (예: 0xc0000005, 0xc0000409 등)
- **Fault offset**: 메모리 주소

## 발견된 이벤트 분석

### 최근 이벤트 (2025-12-12)
- **13:22:11**: MicrosoftEdgeUpdate.exe 오류 (관련 없음)
- **12:55:19-20**: AppTermFailureEvent (커널 레벨 오류, ToDaDot와 직접 관련 없을 수 있음)

### ToDaDot.exe 관련 오류
- **발견되지 않음**: 최근 2일간 ToDaDot.exe와 직접 관련된 Application Error 이벤트 없음
- **가능성**: 
  - 앱이 실행되지 않아 오류가 기록되지 않았을 수 있음
  - 또는 다른 형태의 오류일 수 있음

## C++ Redistributable 확인

### 현재 상태
- `package.json`에 C++ Redistributable 자동 설치 설정 없음
- `better-sqlite3` 사용 시 Visual C++ 2015-2022 Redistributable 필요

### 확인 방법
1. **레지스트리 확인**:
   ```
   HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64
   ```

2. **수동 설치 테스트**:
   - https://aka.ms/vs/17/release/vc_redist.x64.exe 다운로드
   - 설치 후 앱 실행 테스트

### 권장 사항
1. **이벤트 뷰어에서 직접 확인**: Faulting module name 확인
2. **Visual C++ Redistributable 수동 설치**: 테스트 목적
3. **설치 프로그램에 포함**: 사용자 편의를 위해

## 다음 단계

1. **이벤트 뷰어 직접 확인**
   - ToDaDot.exe 관련 오류가 있는지 확인
   - Faulting module name 기록

2. **Visual C++ Redistributable 설치 테스트**
   - 설치 후 앱 실행 확인
   - 문제 해결 여부 확인

3. **설치 프로그램 개선** (필요 시)
   - C++ Redistributable 자동 포함
   - 또는 설치 전 확인 및 안내




