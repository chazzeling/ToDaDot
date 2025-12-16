# Google API 설정 가이드

이 앱에서 Google Calendar와 Google Tasks API를 사용하려면 Google Cloud Console에서 프로젝트를 생성하고 OAuth 2.0 인증 정보를 발급받아야 합니다.

## 1단계: Google Cloud Console 프로젝트 생성

1. [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
2. 상단의 프로젝트 선택 드롭다운을 클릭하고 "새 프로젝트"를 선택합니다.
3. 프로젝트 이름을 입력하고 "만들기"를 클릭합니다.
   - 예: "ToDaDot App"

## 2단계: API 활성화

1. 왼쪽 메뉴에서 "API 및 서비스" > "라이브러리"를 선택합니다.
2. "Google Calendar API"를 검색하고 선택한 후 "사용"을 클릭합니다.
3. 다시 라이브러리로 돌아가서 "Google Tasks API"를 검색하고 선택한 후 "사용"을 클릭합니다.

## 3단계: OAuth 동의 화면 구성 (필수)

1. 왼쪽 메뉴에서 "API 및 서비스" > "OAuth 동의 화면"을 선택합니다.
2. 사용자 유형: **"외부"** 선택 후 "만들기" 클릭
3. 앱 정보 입력:
   - 앱 이름: "ToDaDot" (또는 원하는 이름)
   - 사용자 지원 이메일: 본인의 이메일
   - 개발자 연락처 정보: 본인의 이메일
   - "저장 후 계속" 클릭
4. 범위 추가 (중요):
   - "범위 추가 또는 삭제" 클릭
   - **기존에 등록된 긴 URI 형태 Scope 삭제 확인**:
     - `https://www.googleapis.com/auth/userinfo.email` - 삭제 필요
     - `https://www.googleapis.com/auth/userinfo.profile` - 삭제 필요
     - `https://www.googleapis.com/auth/calendar` - 삭제 필요
     - `https://www.googleapis.com/auth/tasks` - 삭제 필요
   - 다음 2개를 모두 등록:
     - `https://www.googleapis.com/auth/userinfo.email` (사용자 이메일 정보)
     - `https://www.googleapis.com/auth/userinfo.profile` (사용자 프로필 정보)
   - "업데이트" 클릭
   - "저장 후 계속" 클릭
   
   ⚠️ **중요**: 기존 긴 URI 형태 Scope가 남아있으면 `400 invalid_scope` 오류가 발생할 수 있습니다. 반드시 삭제하고 표준 Scope 이름(`email`, `profile`)만 사용하세요.
5. 테스트 사용자 추가 (중요):
   - "테스트 사용자" 섹션에서 "+ 추가" 클릭
   - 본인의 Google 계정 이메일 주소 입력
   - "저장 후 계속" 클릭
6. 요약 확인 후 "대시보드로 돌아가기" 클릭

## 4단계: OAuth 2.0 클라이언트 ID 생성

1. 왼쪽 메뉴에서 "API 및 서비스" > "사용자 인증 정보"를 선택합니다.
2. 상단의 "+ 사용자 인증 정보 만들기" > "OAuth 클라이언트 ID"를 선택합니다.
3. OAuth 클라이언트 ID 생성:
   - 애플리케이션 유형: **"데스크톱 앱"** 선택 (중요!)
   - 이름: "ToDaDot Desktop Client" (또는 원하는 이름)
   - "만들기" 클릭
4. 생성된 클라이언트 ID와 클라이언트 보안 비밀번호를 복사합니다.
   - **중요**: 이 정보는 안전하게 보관하세요!
5. **승인된 리디렉션 URI 추가 (중요!)**:
   - 생성된 OAuth 클라이언트 ID를 클릭하여 편집
   - "승인된 리디렉션 URI" 섹션에서 "+ URI 추가" 클릭
   - 다음 URI를 정확히 입력: `http://localhost:8888`
   - **주의**: `http://127.0.0.1:8888`도 사용 가능하지만 `http://localhost:8888` 권장
   - "저장" 클릭

## 5단계: 앱에서 인증 정보 설정

1. 앱을 실행합니다.
2. 설정 메뉴에서 "Google API 설정"을 선택합니다.
3. 복사한 클라이언트 ID와 클라이언트 보안 비밀번호를 입력합니다.
4. "인증 URL 생성" 버튼을 클릭합니다.
5. 생성된 URL을 브라우저에서 열고 Google 계정으로 로그인합니다.
6. 권한을 승인하면 인증 코드가 표시됩니다.
7. 인증 코드를 앱에 입력하고 "인증 완료" 버튼을 클릭합니다.

## 완료!

이제 Google Calendar와 Google Tasks API를 사용할 수 있습니다.

## 문제 해결

### 400 invalid_request 오류: "OAuth 2.0 policy for keeping apps secure"

이 오류는 Google Cloud Console 설정이 완료되지 않았을 때 발생합니다. 다음을 확인하세요:

1. **OAuth 동의 화면 설정 확인**:
   - API 및 서비스 > OAuth 동의 화면
   - **⚠️ 중요: 기존 긴 URI 형태 Scope 삭제 확인**:
     - `https://www.googleapis.com/auth/userinfo.email` - 삭제되었는지 확인
     - `https://www.googleapis.com/auth/userinfo.profile` - 삭제되었는지 확인
     - `https://www.googleapis.com/auth/calendar` - 삭제되었는지 확인
   - 다음 Scope만 등록되어 있는지 확인:
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
   - 테스트 사용자로 본인 이메일이 추가되어 있는지 확인

2. **승인된 리디렉션 URI 확인**:
   - API 및 서비스 > 사용자 인증 정보
   - OAuth 2.0 클라이언트 ID 선택
   - "승인된 리디렉션 URI"에 `http://localhost:8888`이 정확히 등록되어 있는지 확인
   - 기존의 `todadot://auth`가 있다면 삭제하고 `http://localhost:8888`만 유지

3. **애플리케이션 유형 확인**:
   - OAuth 클라이언트 ID의 애플리케이션 유형이 **"데스크톱 앱"**인지 확인
   - "웹 애플리케이션"이면 400 오류가 발생할 수 있습니다

4. **설정 저장 후 대기**:
   - Google Cloud Console에서 설정을 변경한 후 몇 분(최대 5분) 대기
   - Google 서버에 변경 사항이 반영되는 시간이 필요합니다

5. **앱 재시작**:
   - 설정 변경 후 앱을 완전히 종료하고 다시 시작

### 기타 오류

- **"리디렉션 URI가 일치하지 않습니다" 오류**: 
  - OAuth 클라이언트 설정에서 "승인된 리디렉션 URI"에 `http://localhost:8888`이 정확히 등록되어 있는지 확인하세요.
  - 포트 8888이 다른 프로그램에서 사용 중인지 확인하세요.

- **"API가 활성화되지 않았습니다" 오류**:
  - Google Cloud Console에서 Calendar API와 Tasks API가 활성화되어 있는지 확인하세요.

- **인증 코드를 받지 못한 경우**:
  - 동의 화면에서 테스트 사용자로 본인의 이메일이 추가되어 있는지 확인하세요.








