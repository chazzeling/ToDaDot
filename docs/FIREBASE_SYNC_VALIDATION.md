# Firebase 동기화 검증 문서

## 📋 검증 완료 항목

### 1. 로컬 → Firebase 마이그레이션 검증 ✅

#### 데이터 손실 없는 마이그레이션
- ✅ 로컬 투두의 모든 필드가 Firebase에 저장됨:
  - `id`: 고유 식별자
  - `text`: 투두 텍스트
  - `completed`: 완료 상태
  - `createdAt`: 생성 시간
  - `date`: 날짜
  - `quadrant`: 사분면 (옵션)
  - `categoryId`: 카테고리 ID (옵션)
  - `memo`: 메모 (SQLite에서 가져온 메모 포함)
  - `time`: 시간 (옵션)

#### 메모 필드 처리
- ✅ SQLite의 메모는 투두 객체의 `memo` 필드로 포함되어 Firebase에 저장됨
- ✅ Firebase에서 불러올 때도 SQLite에서 메모를 다시 불러옴 (메모는 SQLite에만 저장)
- ✅ 마이그레이션 시 `loadTodosFromLocalStorage()` 함수가 SQLite에서 메모를 가져와 투두 객체에 포함

#### 마이그레이션 플래그
- ✅ `firebase-todos-sync-completed` 플래그로 중복 마이그레이션 방지
- ✅ 테스트 함수 `window.migrateLocalToFirebase(force)`로 강제 재마이그레이션 가능

### 2. Firebase 양방향 동기화 완성도 ✅

#### 생성 (Create)
- ✅ `addTodoByQuadrant`: 사분면 투두 생성 → Firebase 저장
- ✅ `addTodoByCategory`: 카테고리 투두 생성 → Firebase 저장
- ✅ `addTodoFromBottomSheet`: 바텀시트 투두 생성 → Firebase 저장

#### 수정 (Update)
- ✅ `toggleTodo`: 완료 상태 변경 → Firebase 업데이트
- ✅ `editTodoText`: 텍스트 수정 → Firebase 업데이트
- ✅ `changeTodoDate`: 날짜 변경 → Firebase 업데이트
- ✅ `moveTodoToQuadrant`: 사분면 이동 → Firebase 업데이트
- ✅ `moveTodoToCategory`: 카테고리 이동 → Firebase 업데이트
- ✅ `setTodoTime`: 시간 설정 → Firebase 업데이트
- ✅ `updateTodoMemo`: 메모 수정 → SQLite 저장 + Firebase 투두 업데이트

#### 삭제 (Delete)
- ✅ `deleteTodo`: 투두 삭제 → Firebase 삭제
- ✅ `deleteTodoTime`: 시간 삭제 → Firebase 업데이트
- ✅ `deleteTodoMemo`: 메모 삭제 → SQLite 삭제 + Firebase 투두 업데이트
- ✅ `deleteIncompleteTodos`: 미완료 투두 일괄 삭제 → Firebase 삭제
- ✅ `deleteAllTodos`: 모든 투두 삭제 → Firebase 삭제

#### 동기화 로직 개선
- ✅ `saveTodos` 함수에서 변경 감지 로직 개선:
  - Map을 사용한 효율적인 비교
  - 새로 추가된 투두 감지
  - 수정된 투두 감지 (JSON 비교)
  - 삭제된 투두 감지
  - 병렬 처리로 성능 최적화

#### 로컬 백업
- ✅ 모든 Firebase 작업 후 로컬 localStorage에도 저장 (백업)

### 3. Google Calendar 연동 완성 ✅

#### 생성 (Create)
- ✅ `addEvent`: 일정 생성 → Google Calendar API 호출
- ✅ 성공 시 `googleEventId` 저장

#### 수정 (Update)
- ✅ `updateEvent`: 일정 수정 → Google Calendar API `update` 호출
- ✅ 날짜, 제목, 색상 변경 지원
- ✅ 실패 시 로컬만 업데이트 (폴백)

#### 삭제 (Delete)
- ✅ `deleteEvent`: 일정 삭제 → Google Calendar API `delete` 호출
- ✅ 실패 시 로컬만 삭제 (폴백)

#### IPC 핸들러
- ✅ `google-update-event`: 이벤트 수정 IPC 핸들러 구현
- ✅ `google-delete-event`: 이벤트 삭제 IPC 핸들러 구현

## 🧪 테스트 함수

### 콘솔에서 사용 가능한 테스트 함수

#### 1. 마이그레이션 테스트
```javascript
// 강제 모드로 마이그레이션 실행
window.migrateLocalToFirebase(true)

// 결과:
// {
//   success: true/false,
//   localCount: number,
//   migratedCount: number,
//   firebaseCount: number,
//   errors?: any[]
// }
```

#### 2. 마이그레이션 플래그 리셋
```javascript
// 마이그레이션 플래그 리셋 (다음 로그인 시 마이그레이션 재실행)
window.resetMigrationFlag()
```

#### 3. 로컬과 Firebase 비교
```javascript
// 로컬과 Firebase 투두 데이터 비교
await window.compareLocalAndFirebase()

// 결과:
// {
//   localCount: number,
//   firebaseCount: number,
//   onlyInLocal: TodoItem[],
//   onlyInFirebase: TodoItem[],
//   different: { id, local, firebase }[]
// }
```

## 📝 검증 체크리스트

### 마이그레이션 검증
- [x] 로컬 투두의 모든 필드가 Firebase에 저장되는가?
- [x] SQLite의 메모가 투두 객체에 포함되어 저장되는가?
- [x] 마이그레이션 후 데이터 손실이 없는가?
- [x] 중복 마이그레이션이 방지되는가?
- [x] 테스트 함수가 정상 작동하는가?

### 양방향 동기화 검증
- [x] 투두 생성 시 Firebase에 저장되는가?
- [x] 투두 수정 시 Firebase가 업데이트되는가?
- [x] 투두 삭제 시 Firebase에서 삭제되는가?
- [x] 변경 감지 로직이 정확한가?
- [x] 로컬 백업이 정상 작동하는가?

### Google Calendar 검증
- [x] 일정 생성이 Google Calendar에 반영되는가?
- [x] 일정 수정이 Google Calendar에 반영되는가?
- [x] 일정 삭제가 Google Calendar에 반영되는가?
- [x] 실패 시 로컬 폴백이 작동하는가?

## ⚠️ 주의사항

1. **메모 필드**: 투두의 메모는 SQLite에 별도 저장되며, Firebase에는 투두 객체의 `memo` 필드로 포함됩니다. Firebase에서 불러올 때 SQLite에서 다시 메모를 가져옵니다.

2. **마이그레이션 플래그**: `firebase-todos-sync-completed`가 설정되면 자동 마이그레이션이 실행되지 않습니다. 테스트를 위해 `window.resetMigrationFlag()`로 리셋할 수 있습니다.

3. **에러 처리**: Firebase 작업 실패 시 로컬 데이터는 유지되며, 에러는 콘솔에 기록됩니다. 사용자 경험을 해치지 않도록 설계되었습니다.

4. **성능**: 대량의 투두를 마이그레이션할 때는 Firestore의 500개 제한을 고려하여 배치 처리됩니다.






