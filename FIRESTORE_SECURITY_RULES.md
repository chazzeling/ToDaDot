# Firestore 보안 규칙 설정 가이드

## 문제
닉네임 저장 시 "Missing or insufficient permissions" 오류가 발생합니다.

## 해결 방법

Firebase Console에서 Firestore 보안 규칙을 다음과 같이 설정하세요:

1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택
3. Firestore Database → 규칙 탭
4. 규칙 편집기 확인

**현재 규칙 편집기에 표시된 내용을 확인하세요:**

### 경우 1: 규칙이 비어있거나 기본 규칙만 있는 경우
아래 전체 규칙을 복사하여 붙여넣기:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/profile/info {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/todos/{todoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/diaries/{diaryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/memos/{memoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}

### 경우 2: 이미 규칙이 있는 경우
기존 `match /databases/{database}/documents {` 안에 아래 규칙들만 추가:

    match /users/{userId}/profile/info {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/todos/{todoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/diaries/{diaryId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/memos/{memoId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

5. "게시" 버튼 클릭

## 규칙 설명
- `request.auth != null`: 로그인한 사용자만 접근 가능
- `request.auth.uid == userId`: 자신의 데이터만 읽기/쓰기 가능
- 각 사용자는 `users/{자신의UID}/...` 경로의 데이터만 접근 가능

