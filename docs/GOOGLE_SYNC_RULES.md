# Google Tasks 동기화 규칙 및 충돌 처리 우선순위

## 📋 개요
이 문서는 ToDaDot 앱의 Google Tasks 동기화 기능에서 사용하는 충돌 처리 규칙과 마이그레이션 전략을 정의합니다.

---

## 1️⃣ 최초 연결 시 (마이그레이션 단계)

### 규칙: 로컬 데이터 우선 업로드 (안전한 마이그레이션)

**전략**: 로컬 기기에 쌓여있던 모든 투두를 Google Tasks로 **새롭게 업로드(생성)**합니다.

- **덮어쓰기 위험 최소화**: 기존 Google Tasks 데이터를 덮어쓰지 않고, 로컬 투두만 추가로 생성합니다.
- **데이터 손실 방지**: 로컬 데이터가 안전하게 보존됩니다.
- **중복 방지**: 업로드 후 로컬 투두에 `googleTaskId`를 저장하여 다음 동기화 시 중복 생성을 방지합니다.

### 동작 방식:
1. 사용자가 Google 계정으로 최초 로그인 시
2. 로컬에 저장된 모든 투두를 읽어옵니다 (`localStorage.getItem('eisenhower-todos')`)
3. 각 투두에 대해:
   - `googleTaskId`가 없는 경우에만 Google Tasks API로 업로드
   - 업로드 성공 시 반환된 Google Task ID를 로컬 투두에 저장 (`googleTaskId` 필드)
4. 로컬 데이터는 그대로 유지되며, Google Tasks에 추가만 됩니다.

---

## 2️⃣ 이후 실시간 동기화 시

### 규칙: Google Tasks가 "진실의 출처(Source of Truth)"

**전략**: Google Tasks의 데이터를 **우선순위로 삼고**, 충돌 시 Google 데이터가 로컬 데이터를 덮어씁니다.

### 이유:
- **다기기 일관성**: 사용자가 여러 기기에서 Google Tasks를 사용할 때 동일한 데이터를 보장합니다.
- **클라우드 우선**: 클라우드에 저장된 데이터가 항상 최신 상태를 반영합니다.

### 동작 방식:

#### 로컬 → Google 동기화 (Push)
- 로컬에서 투두를 생성/수정/삭제할 때:
  1. 로컬 상태를 먼저 업데이트 (낙관적 업데이트)
  2. Google Tasks API 호출
  3. 성공 시 `googleTaskId` 저장
  4. 실패 시 사용자에게 알림 및 로컬 상태 롤백 고려

#### Google → 로컬 동기화 (Pull)
- 주기적으로 또는 앱 시작 시 Google Tasks에서 최신 데이터를 가져옴:
  1. Google Tasks API에서 모든 태스크 조회
  2. 로컬 투두와 매칭 (`googleTaskId` 기준)
  3. **충돌 발생 시**: Google 데이터가 로컬 데이터를 덮어씀
  4. 로컬에만 있는 투두는 유지 (아직 Google에 업로드되지 않은 경우)

---

## 3️⃣ 충돌 처리 상세 규칙

### 시나리오별 처리 방법:

#### 시나리오 1: 로컬 투두가 있고 Google에 없는 경우
- **처리**: 로컬 투두를 Google Tasks로 업로드 (마이그레이션 또는 새 생성)

#### 시나리오 2: Google 태스크가 있고 로컬에 없는 경우
- **처리**: Google 태스크를 로컬에 추가

#### 시나리오 3: 둘 다 있지만 내용이 다른 경우 (충돌)
- **처리**: Google 데이터가 로컬 데이터를 덮어씀
- **이유**: Google Tasks가 Source of Truth

#### 시나리오 4: 로컬에서 삭제했지만 Google에는 있는 경우
- **처리**: Google Tasks에서도 삭제 (양방향 삭제)

#### 시나리오 5: Google에서 삭제했지만 로컬에는 있는 경우
- **처리**: 로컬에서도 삭제 (Google 우선)

---

## 4️⃣ 동기화 상태 관리

### TodoItem 타입 확장:
```typescript
export interface TodoItem {
  id: string;                    // 로컬 고유 ID
  googleTaskId?: string;         // Google Tasks ID (동기화 표시)
  text: string;
  completed: boolean;
  createdAt: number;
  date: string;
  quadrant?: Quadrant;
  categoryId?: string;
  memo?: string;
  time?: string;
}
```

### 동기화 상태 플래그:
- `googleTaskId`가 있음: Google Tasks와 동기화된 투두
- `googleTaskId`가 없음: 로컬에만 존재하는 투두 (업로드 필요)

---

## 5️⃣ 마이그레이션 트리거 시점

### 최초 마이그레이션이 실행되는 조건:
1. Google 계정으로 최초 로그인 시
2. `localStorage`에 `'google-sync-completed'` 플래그가 없을 때
3. 로컬에 `googleTaskId`가 없는 투두가 하나라도 있을 때

### 마이그레이션 완료 후:
- `localStorage.setItem('google-sync-completed', 'true')` 저장
- 이후 최초 마이그레이션은 실행하지 않음

---

## 6️⃣ 에러 처리

### Google API 호출 실패 시:
- **네트워크 오류**: 로컬에만 저장하고, 다음 동기화 시 재시도
- **인증 오류**: 사용자에게 재로그인 요청
- **권한 오류**: 사용자에게 권한 설정 안내

### 로컬 저장 실패 시:
- **localStorage 용량 초과**: 사용자에게 알림
- **SQLite 오류**: 로그 기록 후 계속 진행

---

## 📝 참고사항

- 이 규칙은 **Google Tasks**에만 적용됩니다.
- Google Calendar는 별도의 규칙을 따릅니다.
- Firebase(일기/메모)는 별도의 동기화 전략을 사용합니다.






