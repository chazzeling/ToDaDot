# Google Cloud Console Scope 정리 가이드

## 중요: 기존 Scope 삭제 확인

Google Cloud Console의 'OAuth 동의 화면' → '요청된 OAuth 범위' 섹션에서 **반드시 삭제해야 할 기존 Scope**들이 있습니다.

## 삭제해야 할 Scope (긴 URI 형태)

다음 Scope들이 등록되어 있다면 **모두 삭제**하세요:

1. ❌ `https://www.googleapis.com/auth/userinfo.email` - 삭제
2. ❌ `https://www.googleapis.com/auth/userinfo.profile` - 삭제
3. ❌ `https://www.googleapis.com/auth/calendar` - 삭제 (더 이상 사용하지 않음)
4. ❌ `https://www.googleapis.com/auth/tasks` - 삭제 (더 이상 사용하지 않음)

## 유지해야 할 Scope (Google OAuth 2.0 표준)

다음 Scope만 등록되어 있어야 합니다:

1. ✅ `https://www.googleapis.com/auth/userinfo.email` - 유지
2. ✅ `https://www.googleapis.com/auth/userinfo.profile` - 유지

## 정리 방법

### 1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택

### 2. OAuth 동의 화면으로 이동
1. 왼쪽 메뉴에서 **"API 및 서비스"** → **"OAuth 동의 화면"** 선택
2. 프로젝트가 이미 설정되어 있다면 편집 모드로 들어가기

### 3. Scope 정리
1. **"범위 추가 또는 삭제"** 버튼 클릭
2. 현재 등록된 Scope 목록 확인
3. 다음 Scope들을 찾아서 **삭제**:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
4. 다음 Scope만 남기고 나머지는 모두 삭제:
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 4. 저장
1. **"업데이트"** 클릭
2. **"저장 후 계속"** 클릭
3. 설정이 완료되면 저장

## 최종 확인

정리 후 '요청된 OAuth 범위' 섹션에 다음과 같이 표시되어야 합니다:

```
✅ https://www.googleapis.com/auth/userinfo.email
✅ https://www.googleapis.com/auth/userinfo.profile
```

Calendar나 Tasks 관련 Scope(`https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/tasks`)는 제거되어야 합니다.

## 왜 중요한가?

- 긴 URI 형태의 Scope와 표준 Scope 이름을 혼용하면 Google OAuth에서 `400 invalid_scope` 오류가 발생할 수 있습니다.
- 앱 코드에서는 표준 Scope 이름(`email`, `profile`)만 사용하므로, Google Cloud Console 설정도 동일하게 맞춰야 합니다.
- 불일치가 발생하면 인증이 실패할 수 있습니다.

## 문제 발생 시

만약 Scope를 삭제한 후에도 오류가 발생한다면:

1. **저장 후 5분 대기**: Google 서버에 변경 사항이 반영되는 시간이 필요합니다.
2. **앱 완전 재시작**: 변경 사항을 적용하기 위해 앱을 완전히 종료하고 다시 실행합니다.
3. **브라우저 캐시 삭제**: 브라우저의 OAuth 인증 캐시를 삭제합니다.
4. **새 OAuth 인증 시도**: 기존 인증을 해제하고 다시 인증을 시도합니다.

