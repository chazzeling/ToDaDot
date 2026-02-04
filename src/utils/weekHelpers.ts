import { DateString } from '../types';

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const toDateString = (d: Date): DateString => {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
};

export const fromDateString = (dateStr: DateString): Date => {
  const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

/**
 * 주어진 날짜가 속한 주의 시작일(월요일) 반환 (YYYY-MM-DD)
 */
export const getWeekStart = (date: Date): DateString => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun,1=Mon...
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return toDateString(d);
};

export const addDays = (dateStr: DateString, days: number): DateString => {
  const d = fromDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
};

export const getWeekDates = (weekStart: DateString): DateString[] =>
  Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export const formatWeekLabel = (weekStart: DateString): string => {
  const start = fromDateString(weekStart);
  const end = fromDateString(addDays(weekStart, 6));
  return `${start.getFullYear()}.${pad2(start.getMonth() + 1)}.${pad2(start.getDate())} ~ ${pad2(end.getMonth() + 1)}.${pad2(end.getDate())}`;
};

export const formatDateLabel = (dateStr: DateString): string => {
  const d = fromDateString(dateStr);
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] ?? '';
  return `${weekday} ${d.getMonth() + 1}/${d.getDate()}`;
};




