// 투두 아이템 타입
export interface TodoItem {
  id: string; // 고유 ID (로컬/Firebase 공통)
  text: string;
  completed: boolean;
  createdAt: number;
  date: string; // YYYY-MM-DD 형식
  quadrant?: Quadrant; // 대분류 (사분면)
  categoryId?: string; // 소분류 (카테고리 ID)
  memo?: string; // 메모
  time?: string; // 시간 (HH:mm 형식)
  order?: number; // 같은 quadrant/category 내 순서
  isTodayFocus?: boolean; // Daily Focus 목록에 선택되었는지 여부
  focusOrder?: number | null; // Daily Focus 탭 내에서 사용자가 지정한 순서
}

// 일정 타입
export interface Event {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD 형식 (시작일)
  endDate?: string; // YYYY-MM-DD 형식 (종료일, 기간 일정인 경우)
  color: string;
  categoryId?: string; // 이벤트 카테고리 ID (사용자 지정 카테고리)
  time?: string; // 시간 (HH:mm 형식)
  createdAt: number;
  googleEventId?: string; // Google Calendar 이벤트 ID (Google API 사용 시)
}

// 아이젠하워 매트릭스 분면 타입
export type Quadrant = 
  | 'urgent-important' 
  | 'not-urgent-important' 
  | 'urgent-not-important' 
  | 'not-urgent-not-important'
  | 'uncategorized'; // 분류되지 않음

// 카테고리 타입 (할일용)
export interface Category {
  id: string;
  name: string;
  color: string; // 체크박스 색상
  createdAt: number;
  order?: number; // 카테고리 순서 (드래그 정렬용)
}

// 분류 타입 (일정용)
export interface EventCategory {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

// 무드 트래커 타입
export interface MoodEntry {
  date: string; // YYYY-MM-DD 형식
  color: string;
}

// 메모 타입
export interface Memo {
  id: string;
  date: string; // YYYY-MM-DD 형식
  content: string;
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean; // 고정 여부
  pinnedDayOfWeek?: number; // 고정된 요일 (0=일요일, 1=월요일, ..., 6=토요일)
}

// 일기 타입
export interface Diary {
  id: string;
  date: string; // YYYY-MM-DD 형식
  content: string;
  createdAt: number;
  updatedAt: number;
}

// 루틴 타입
export interface Routine {
  id: string;
  text: string;
  createdAt: number;
  order?: number; // 순서
}

// 날짜 형식: YYYY-MM-DD
export type DateString = string;

// 시간 계획 패널 타입
export interface TimeBlock {
  id: string; // 블록 고유 ID
  startTime: number; // 시작 시간 (분 단위, 0~1439)
  endTime: number; // 끝 시간 (분 단위, 0~1439)
  color: string; // 블록 색상
  categoryName: string; // 카테고리 이름 (활동 이름)
  label?: string; // 블록에 표시될 텍스트 라벨
}

export interface TimePlannerCategory {
  color: string; // 색상 코드
  name: string; // 카테고리 이름 (예: 업무, 학습, 운동)
}

export interface TimePlannerData {
  date: DateString; // 날짜
  blocks: TimeBlock[]; // 시간 블록들
  categories: TimePlannerCategory[]; // 카테고리 설정
}

// 스티커 레이아웃 타입
export interface StickerLayout {
  id: string;
  name: string;
  resolution: {
    width: number;
    height: number;
  };
  stickers: Sticker[];
  savedAt: Date;
}

// 스티커 타입
export interface Sticker {
  id: string;
  imagePath: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation?: number; // 회전 각도 (degrees)
  zIndex?: number; // z-index 값
  // 반응형 위치 (percentages)
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  // 날짜에 상대적 위치 (스크롤과 함께 움직임)
  date?: string; // YYYY-MM-DD 형식
  dayOffsetX?: number; // 날짜 셀 내부의 X 오프셋
  dayOffsetY?: number; // 날짜 셀 내부의 Y 오프셋
}

// 테마 색상 타입
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  danger: string;
  dangerLight: string;
}

// 테마 타입
export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}