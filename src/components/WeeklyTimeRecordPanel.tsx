import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Activity,
  Bike,
  Footprints,
  Zap,
  Heart,
  PersonStanding,
  Droplet,
  Coffee,
  Apple,
  Salad,
  Book,
  BookOpen,
  GraduationCap,
  FileText,
  Palette as PaletteIcon,
  Pen,
  Music,
  Camera,
  Moon,
  Bed,
  Sun,
  CloudMoon,
  Brain,
  Sparkles,
  Smile,
  HeartHandshake,
  CheckSquare,
  Target,
  Timer,
  Laptop,
  Home,
  Shirt,
  Trash,
  Phone,
  Smartphone,
  Cigarette,
  Bath,
  Users,
  MessageCircle,
  Gift,
  Eraser,
  Save,
  FileDown,
  RefreshCcw,
  Map,
  PawPrint,
} from 'lucide-react';
import { DateString, TimeBlock, TimePlannerCategory, TimePlannerData } from '../types';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import * as timeRecordService from '../firebase/timePlannerService';
import { formatDateLabel, formatWeekLabel, getWeekDates, getWeekStart, addDays } from '../utils/weekHelpers';
import './WeeklyTimeRecordPanel.css';

const STORAGE_KEY = 'time-record-data';
const CATEGORIES_STORAGE_KEY = 'time-record-categories';
const WEEKLY_TEMPLATES_KEY = 'weekly-time-record-templates-v1';
const WEEKLY_ROUTINES_KEY = 'weekly-routines-v1';
const WEEKLY_ROUTINE_CONFIG_KEY = 'weekly-routine-config-v1';

type TemplateBlock = Pick<TimeBlock, 'startTime' | 'endTime' | 'color' | 'categoryName' | 'label'>;
type WeeklyTemplate = Record<number, TemplateBlock[]>;

type NamedWeeklyTemplate = {
  id: string;
  name: string;
  template: WeeklyTemplate;
  createdAt: number;
};

type WeeklyRoutineDay = {
  names: string[];
  checks: boolean[];
};

type WeeklyRoutineState = Record<number, WeeklyRoutineDay>;

type RoutineIconId =
  | 'dumbbell'
  | 'activity'
  | 'bike'
  | 'footprints'
  | 'zap'
  | 'heart'
  | 'personStanding'
  | 'droplet'
  | 'coffee'
  | 'apple'
  | 'salad'
  | 'book'
  | 'bookOpen'
  | 'graduationCap'
  | 'fileText'
  | 'palette'
  | 'pen'
  | 'music'
  | 'camera'
  | 'moon'
  | 'bed'
  | 'sun'
  | 'cloudMoon'
  | 'brain'
  | 'sparkles'
  | 'smile'
  | 'heartHandshake'
  | 'checkSquare'
  | 'target'
  | 'timer'
  | 'laptop'
  | 'home'
  | 'shirt'
  | 'trash'
  | 'phone'
  | 'smartphone'
  | 'cigarette'
  | 'bath'
  | 'users'
  | 'messageCircle'
  | 'gift';

type RoutineSlotConfig = {
  iconId: RoutineIconId;
  label: string;
};

const ROUTINE_ICON_COMPONENTS: Record<RoutineIconId, LucideIcon> = {
  dumbbell: Dumbbell,
  activity: Activity,
  bike: Bike,
  footprints: Footprints,
  zap: Zap,
  heart: Heart,
  personStanding: PersonStanding,
  droplet: Droplet,
  coffee: Coffee,
  apple: Apple,
  salad: Salad,
  book: Book,
  bookOpen: BookOpen,
  graduationCap: GraduationCap,
  fileText: FileText,
  palette: PaletteIcon,
  pen: Pen,
  music: Music,
  camera: Camera,
  moon: Moon,
  bed: Bed,
  sun: Sun,
  cloudMoon: CloudMoon,
  brain: Brain,
  sparkles: Sparkles,
  smile: Smile,
  heartHandshake: HeartHandshake,
  checkSquare: CheckSquare,
  target: Target,
  timer: Timer,
  laptop: Laptop,
  home: Home,
  shirt: Shirt,
  trash: Trash,
  phone: Phone,
  smartphone: Smartphone,
  cigarette: Cigarette,
  bath: Bath,
  users: Users,
  messageCircle: MessageCircle,
  gift: Gift,
};

const ROUTINE_ICON_OPTIONS: { id: RoutineIconId; label: string; group: string }[] = [
  // 건강 & 운동
  { id: 'dumbbell', label: 'Dumbbell - 웨이트 운동', group: '건강 & 운동' },
  { id: 'activity', label: 'Activity - 일반 운동/활동', group: '건강 & 운동' },
  { id: 'bike', label: 'Bike - 자전거', group: '건강 & 운동' },
  { id: 'footprints', label: 'Footprints - 걷기/산책', group: '건강 & 운동' },
  { id: 'zap', label: 'Zap - 에너지/활력', group: '건강 & 운동' },
  { id: 'heart', label: 'Heart - 심장 건강/유산소', group: '건강 & 운동' },
  { id: 'personStanding', label: 'PersonStanding - 요가/스트레칭', group: '건강 & 운동' },
  // 수분 & 영양
  { id: 'droplet', label: 'Droplet - 물 마시기', group: '수분 & 영양' },
  { id: 'coffee', label: 'Coffee - 커피/음료', group: '수분 & 영양' },
  { id: 'apple', label: 'Apple - 건강한 식사', group: '수분 & 영양' },
  { id: 'salad', label: 'Salad - 샐러드/채소', group: '수분 & 영양' },
  // 공부 & 독서
  { id: 'book', label: 'Book - 독서', group: '공부 & 독서' },
  { id: 'bookOpen', label: 'BookOpen - 책 읽기', group: '공부 & 독서' },
  { id: 'graduationCap', label: 'GraduationCap - 공부/학습', group: '공부 & 독서' },
  { id: 'fileText', label: 'FileText - 문서/노트', group: '공부 & 독서' },
  // 창작 활동
  { id: 'palette', label: 'Palette - 그림 그리기', group: '창작 활동' },
  { id: 'pen', label: 'Pen - 글쓰기', group: '창작 활동' },
  { id: 'music', label: 'Music - 음악', group: '창작 활동' },
  { id: 'camera', label: 'Camera - 사진', group: '창작 활동' },
  // 수면 & 휴식
  { id: 'moon', label: 'Moon - 수면', group: '수면 & 휴식' },
  { id: 'bed', label: 'Bed - 잠자기', group: '수면 & 휴식' },
  { id: 'sun', label: 'Sun - 기상', group: '수면 & 휴식' },
  { id: 'cloudMoon', label: 'CloudMoon - 일찍 자기', group: '수면 & 휴식' },
  // 마음 챙김 & 정신 건강
  { id: 'brain', label: 'Brain - 명상/집중', group: '마음 챙김 & 정신 건강' },
  { id: 'sparkles', label: 'Sparkles - 긍정/감사', group: '마음 챙김 & 정신 건강' },
  { id: 'smile', label: 'Smile - 기분 좋은 활동', group: '마음 챙김 & 정신 건강' },
  { id: 'heartHandshake', label: 'HeartHandshake - 자기 돌봄', group: '마음 챙김 & 정신 건강' },
  // 생산성 & 업무
  { id: 'checkSquare', label: 'CheckSquare - 할 일 완료', group: '생산성 & 업무' },
  { id: 'target', label: 'Target - 목표 달성', group: '생산성 & 업무' },
  { id: 'timer', label: 'Timer - 시간 관리', group: '생산성 & 업무' },
  { id: 'laptop', label: 'Laptop - 업무/공부', group: '생산성 & 업무' },
  // 일상 & 습관
  { id: 'home', label: 'Home - 집안일', group: '일상 & 습관' },
  { id: 'shirt', label: 'Shirt - 옷 정리', group: '일상 & 습관' },
  { id: 'trash', label: 'Trash - 청소', group: '일상 & 습관' },
  { id: 'phone', label: 'Phone - 디지털 디톡스 (끄기)', group: '일상 & 습관' },
  { id: 'smartphone', label: 'Smartphone - 휴대폰 사용 제한', group: '일상 & 습관' },
  { id: 'cigarette', label: 'Cigarette - 금연', group: '일상 & 습관' },
  { id: 'bath', label: 'Bath - 목욕/샤워', group: '일상 & 습관' },
  // 소셜 & 관계
  { id: 'users', label: 'Users - 사람 만나기', group: '소셜 & 관계' },
  { id: 'messageCircle', label: 'MessageCircle - 대화/연락', group: '소셜 & 관계' },
  { id: 'gift', label: 'Gift - 선물/배려', group: '소셜 & 관계' },
];

// TimeRecordPanel과 동일 기본 팔레트
const defaultColors: string[] = [
  '#ffccceff',
  '#FFD9B3',
  '#FFF2B2',
  '#b7ffcdff',
  '#c7c9ffff',
  '#e0c6ffff',
  '#FA8B8B',
  '#D3FAA3',
  '#6493FA',
  '#F5F5F5',
  '#DBDBDB',
  '#9E9E9E',
];

type WeekDataMap = Record<DateString, TimePlannerData | null>;

export default function WeeklyTimeRecordPanel() {
  const { user, isAuthenticated } = useFirebaseAuth();

  const [currentWeekStart, setCurrentWeekStart] = useState<DateString>(() => getWeekStart(new Date()));
  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [categories, setCategories] = useState<TimePlannerCategory[]>(() => {
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return defaultColors.map((color, index) => ({
          color,
          name: parsed[index]?.name || `색상 ${index + 1}`,
        }));
      } catch {
        // fallthrough
      }
    }
    return defaultColors.map((color, index) => ({ color, name: `색상 ${index + 1}` }));
  });

  const [weekData, setWeekData] = useState<WeekDataMap>({} as WeekDataMap);
  const weekDataRef = useRef<WeekDataMap>({} as WeekDataMap);
  const categoriesRef = useRef<TimePlannerCategory[]>(categories);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    weekDataRef.current = weekData;
  }, [weekData]);

  const startHour = 6;
  const endHour = 30; // 다음날 새벽 5시까지 (30:00) 표시
  const startMinutes = startHour * 60;
  const slotsPerHour = 6; // 10분 단위
  const totalSlots = (endHour - startHour) * slotsPerHour; // 108

  const cellIndexToMinutes = (cellIndex: number) => startMinutes + cellIndex * 10;

  const loadWeek = useCallback(async () => {
    setIsLoading(true);

    const localAll = (() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {} as Record<DateString, TimePlannerData>;
      try {
        return JSON.parse(raw) as Record<DateString, TimePlannerData>;
      } catch {
        return {} as Record<DateString, TimePlannerData>;
      }
    })();

    // 로컬 먼저 채우기
    const base: WeekDataMap = {} as WeekDataMap;
    weekDates.forEach((d) => {
      base[d] = localAll[d] ?? null;
    });
    setWeekData(base);

    // Firebase가 가능하면 날짜별로 최신을 가져와 덮어쓰기(있을 때만)
    if (isAuthenticated && user) {
      const results = await Promise.allSettled(
        weekDates.map(async (d) => {
          const data = await timeRecordService.getTimeRecordData(d);
          return { date: d, data };
        })
      );

      const merged: WeekDataMap = { ...base };
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const { date, data } = r.value;
          if (data) merged[date] = data;
        }
      });
      setWeekData(merged);
    }

    setIsLoading(false);
  }, [isAuthenticated, user, weekDates]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  // 카테고리는 전역 설정이므로 localStorage + Firebase에 저장 (주간에서도 동일하게 유지)
  useEffect(() => {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    if (isAuthenticated && user) {
      timeRecordService.saveTimeRecordCategories(categories).catch(() => {});
    }
  }, [categories, isAuthenticated, user]);

  const persistDay = useCallback(async (date: DateString, dayData: TimePlannerData) => {
    // localStorage map 업데이트
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let all: Record<DateString, TimePlannerData> = {};
      if (raw) {
        try {
          all = JSON.parse(raw);
        } catch {
          all = {};
        }
      }
      all[date] = dayData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }

    // Firebase 저장
    if (isAuthenticated && user) {
      try {
        await timeRecordService.saveTimeRecordData(dayData);
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated, user]);

  const getBlocksForDate = useCallback((date: DateString): TimeBlock[] => {
    return weekData[date]?.blocks ?? [];
  }, [weekData]);

  const setBlocksForDate = useCallback(async (date: DateString, blocks: TimeBlock[]) => {
    const dayData: TimePlannerData = {
      date,
      blocks,
      categories: categoriesRef.current,
    };

    setWeekData((prev) => ({ ...prev, [date]: dayData }));
    await persistDay(date, dayData);
  }, [persistDay]);

  const getBlockAtCell = useCallback((date: DateString, cellIndex: number): TimeBlock | null => {
    const blocks = getBlocksForDate(date);
    const cellStart = cellIndexToMinutes(cellIndex);
    const cellEnd = cellStart + 10;
    const exact = blocks.find((b) => cellStart >= b.startTime && cellStart < b.endTime);
    if (exact) return exact;
    const overlapping = blocks.filter((b) => b.startTime < cellEnd && b.endTime > cellStart);
    if (overlapping.length === 0) return null;
    return overlapping.reduce((p, c) => (p.startTime < c.startTime ? p : c));
  }, [getBlocksForDate]);

  const [isDragging, setIsDragging] = useState(false);
  const dragDateRef = useRef<DateString | null>(null);
  const dragStartCellRef = useRef<number | null>(null);
  const dragEndCellRef = useRef<number | null>(null);
  const justDraggedRef = useRef(false);

  const [editingCell, setEditingCell] = useState<{ date: DateString; cellIndex: number } | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const [templates, setTemplates] = useState<NamedWeeklyTemplate[]>(() => {
    const raw = localStorage.getItem(WEEKLY_TEMPLATES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as NamedWeeklyTemplate[];
      if (!Array.isArray(parsed)) return [];
      return parsed.sort((a, b) => a.createdAt - b.createdAt);
    } catch {
      return [];
    }
  });

  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateToDeleteId, setTemplateToDeleteId] = useState<string | null>(null);
  const [showMiniOverview, setShowMiniOverview] = useState(false);
  const [showRoutineManager, setShowRoutineManager] = useState(false);

  const getDefaultRoutineDay = (): WeeklyRoutineDay => ({
    names: ['', '', '', ''],
    checks: [false, false, false, false],
  });

  const getDefaultRoutineState = (): WeeklyRoutineState => {
    const state: WeeklyRoutineState = {};
    for (let i = 0; i < 7; i++) {
      state[i] = getDefaultRoutineDay();
    }
    return state;
  };

  const [weeklyRoutines, setWeeklyRoutines] = useState<Record<DateString, WeeklyRoutineState>>(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_ROUTINES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<DateString, any>;
      if (!parsed || typeof parsed !== 'object') return {};
      const normalized: Record<DateString, WeeklyRoutineState> = {};
      Object.entries(parsed).forEach(([key, value]) => {
        const weekState: WeeklyRoutineState = {};
        for (let i = 0; i < 7; i++) {
          const dayValue = value?.[i];
          const names = Array.isArray(dayValue?.names) ? dayValue.names.slice(0, 4) : [];
          const checks = Array.isArray(dayValue?.checks) ? dayValue.checks.slice(0, 4) : [];
          while (names.length < 4) names.push('');
          while (checks.length < 4) checks.push(false);
          weekState[i] = { names, checks };
        }
        normalized[key as DateString] = weekState;
      });
      return normalized;
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(WEEKLY_ROUTINES_KEY, JSON.stringify(weeklyRoutines));
    } catch {
      // ignore
    }
  }, [weeklyRoutines]);

  const currentRoutineState: WeeklyRoutineState =
    weeklyRoutines[currentWeekStart] ?? getDefaultRoutineState();

  const [routineConfigs, setRoutineConfigs] = useState<RoutineSlotConfig[]>(() => {
    try {
      const raw = localStorage.getItem(WEEKLY_ROUTINE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RoutineSlotConfig[];
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    // 기본값: 대표적인 네 가지 루틴
    return [
      { iconId: 'dumbbell', label: '운동' },
      { iconId: 'droplet', label: '물 마시기' },
      { iconId: 'book', label: '공부/독서' },
      { iconId: 'moon', label: '수면' },
    ];
  });

  const [routineDrafts, setRoutineDrafts] = useState<RoutineSlotConfig[]>(routineConfigs);
  const [openRoutineIconIndex, setOpenRoutineIconIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(WEEKLY_ROUTINE_CONFIG_KEY, JSON.stringify(routineConfigs));
    } catch {
      // ignore
    }
  }, [routineConfigs]);

  const updateRoutineName = (dayIndex: number, index: number, value: string) => {
    if (index < 0 || index > 3) return;
    if (dayIndex < 0 || dayIndex > 6) return;
    setWeeklyRoutines((prev) => {
      const base = prev[currentWeekStart] ?? getDefaultRoutineState();
      const weekCopy: WeeklyRoutineState = { ...base };
      const day = weekCopy[dayIndex] ?? getDefaultRoutineDay();
      const names = [...day.names];
      const checks = [...day.checks];
      names[index] = value;
      weekCopy[dayIndex] = { names, checks };
      return { ...prev, [currentWeekStart]: weekCopy };
    });
  };

  const toggleRoutineCheck = (dayIndex: number, index: number) => {
    if (index < 0 || index > 3) return;
    if (dayIndex < 0 || dayIndex > 6) return;
    setWeeklyRoutines((prev) => {
      const base = prev[currentWeekStart] ?? getDefaultRoutineState();
      const weekCopy: WeeklyRoutineState = { ...base };
      const day = weekCopy[dayIndex] ?? getDefaultRoutineDay();
      const names = [...day.names];
      const checks = [...day.checks];
      checks[index] = !checks[index];
      weekCopy[dayIndex] = { names, checks };
      return { ...prev, [currentWeekStart]: weekCopy };
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(WEEKLY_TEMPLATES_KEY, JSON.stringify(templates));
    } catch {
      // ignore
    }
  }, [templates]);

  const startEdit = useCallback((date: DateString, cellIndex: number) => {
    const block = getBlockAtCell(date, cellIndex);
    if (!block) return;
    setEditingCell({ date, cellIndex });
    setEditingValue(block.label ?? '');
  }, [getBlockAtCell]);

  const commitEdit = useCallback(async () => {
    if (!editingCell) return;
    const { date, cellIndex } = editingCell;
    const block = getBlockAtCell(date, cellIndex);
    if (!block) {
      setEditingCell(null);
      return;
    }
    const blocks = getBlocksForDate(date);
    const updated = blocks.map((b) => (b.id === block.id ? { ...b, label: editingValue } : b));
    await setBlocksForDate(date, updated);
    setEditingCell(null);
  }, [editingCell, editingValue, getBlockAtCell, getBlocksForDate, setBlocksForDate]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditingValue('');
  }, []);

  const commitCategoryNameEdit = useCallback(() => {
    if (editingCategoryIndex === null) return;
    const name = editingCategoryName.trim();
    if (!name) {
      setEditingCategoryIndex(null);
      setEditingCategoryName('');
      return;
    }
    setCategories((prev) =>
      prev.map((cat, idx) => (idx === editingCategoryIndex ? { ...cat, name } : cat))
    );
    setEditingCategoryIndex(null);
    setEditingCategoryName('');
  }, [editingCategoryIndex, editingCategoryName, setCategories]);

  const handleCellMouseDown = (date: DateString, cellIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const existing = getBlockAtCell(date, cellIndex);
    if (existing) return; // 기존 블록은 클릭으로 처리

    setIsDragging(true);
    dragDateRef.current = date;
    dragStartCellRef.current = cellIndex;
    dragEndCellRef.current = cellIndex;
    e.preventDefault();
  };

  const handleCellMouseEnter = (date: DateString, cellIndex: number, e: React.MouseEvent) => {
    if (!isDragging) return;
    if (dragDateRef.current !== date) return; // 같은 날짜에서만 드래그
    dragEndCellRef.current = cellIndex;
    e.preventDefault();
  };

  const finishDrag = useCallback(async () => {
    if (!isDragging) return;
    const date = dragDateRef.current;
    const s = dragStartCellRef.current;
    const t = dragEndCellRef.current;
    if (!date || s === null || t === null) {
      setIsDragging(false);
      return;
    }

    const startCell = Math.min(s, t);
    const endCell = Math.max(s, t);

    const existingBlocks = getBlocksForDate(date);

    if (selectedCategoryIndex < 0) {
      // 지우개 모드: 드래그 구간에 겹치는 블록들은 모두 삭제
      const rangeStart = cellIndexToMinutes(startCell);
      const rangeEnd = cellIndexToMinutes(endCell) + 10; // 마지막 셀 끝 시각
      const remaining = existingBlocks.filter(
        (b) => b.endTime <= rangeStart || b.startTime >= rangeEnd
      );
      await setBlocksForDate(date, remaining);
    } else {
      // 일반 색 라벨: 드래그 구간만큼 새 블록 생성
      const selectedColor = categories[selectedCategoryIndex]?.color || defaultColors[0];
      const selectedName = categories[selectedCategoryIndex]?.name || '색상 1';

      const newBlocks: TimeBlock[] = [];
      for (let idx = startCell; idx <= endCell; idx++) {
        const minutes = cellIndexToMinutes(idx);
        // 이미 블록이 있으면 skip
        const has = existingBlocks.some((b) => minutes >= b.startTime && minutes < b.endTime);
        if (has) continue;
        newBlocks.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + idx,
          startTime: minutes,
          endTime: minutes + 10,
          color: selectedColor,
          categoryName: selectedName,
          label: '',
        });
      }

      if (newBlocks.length > 0) {
        await setBlocksForDate(date, [...existingBlocks, ...newBlocks]);
      }
    }

    setIsDragging(false);
    dragDateRef.current = null;
    dragStartCellRef.current = null;
    dragEndCellRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 250);
  }, [isDragging, getBlocksForDate, categories, selectedCategoryIndex, setBlocksForDate]);

  useEffect(() => {
    const onUp = () => finishDrag();
    if (isDragging) {
      document.addEventListener('mouseup', onUp);
      return () => document.removeEventListener('mouseup', onUp);
    }
  }, [isDragging, finishDrag]);

  const handleCellClick = async (date: DateString, cellIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (justDraggedRef.current) return;

    const minutes = cellIndexToMinutes(cellIndex);
    const blocks = getBlocksForDate(date);
    const existing = getBlockAtCell(date, cellIndex);

    // 지우개 라벨이 선택된 경우: 기존 블록이 있으면 삭제
    if (selectedCategoryIndex < 0) {
      if (!existing) return;
      await setBlocksForDate(date, blocks.filter((b) => b.id !== existing.id));
      return;
    }

    const selectedColor = categories[selectedCategoryIndex]?.color || defaultColors[0];
    const selectedName = categories[selectedCategoryIndex]?.name || '색상 1';

    if (existing) {
      const updated = blocks.map((b) => (b.id === existing.id ? { ...b, color: selectedColor, categoryName: selectedName } : b));
      await setBlocksForDate(date, updated);
      return;
    }

    const newBlock: TimeBlock = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      startTime: minutes,
      endTime: minutes + 10,
      color: selectedColor,
      categoryName: selectedName,
      label: '',
    };
    await setBlocksForDate(date, [...blocks, newBlock]);
  };

  const handleCellContextMenu = async (date: DateString, cellIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    const blocks = getBlocksForDate(date);
    const existing = getBlockAtCell(date, cellIndex);
    if (!existing) return;
    await setBlocksForDate(date, blocks.filter((b) => b.id !== existing.id));
  };

  const hourLabels = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour]
  );

  const goPrev = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const goNext = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [weekPickerDate, setWeekPickerDate] = useState<DateString>(() => currentWeekStart);
  const handlePickDate = (date: DateString) => {
    setCurrentWeekStart(getWeekStart(new Date(date)));
    setWeekPickerDate(date);
    setShowWeekPicker(false);
  };

  const saveCurrentWeekAsTemplate = (rawName: string) => {
    const name = rawName.trim();
    if (!name) return;

    const template: WeeklyTemplate = {};
    weekDates.forEach((date, index) => {
      const blocks = getBlocksForDate(date);
      template[index] = blocks.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
        color: b.color,
        categoryName: b.categoryName,
        label: b.label,
      }));
    });

    setTemplates((prev) => {
      const existingIndex = prev.findIndex((t) => t.name === name);
      const nextTemplate: NamedWeeklyTemplate = existingIndex >= 0
        ? { ...prev[existingIndex], template, createdAt: Date.now() }
        : {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name,
            template,
            createdAt: Date.now(),
          };

      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = nextTemplate;
        return copy;
      }
      return [...prev, nextTemplate];
    });

    alert('현재 주를 템플릿으로 저장했습니다.');
  };

  const applyTemplateById = useCallback(
    async (templateId: string) => {
      const target = templates.find((t) => t.id === templateId);
      if (!target) {
        alert('선택한 템플릿을 찾을 수 없습니다.');
        return;
      }

      const parsed = target.template;
      for (let i = 0; i < weekDates.length; i++) {
        const date = weekDates[i];
        const templateBlocks = parsed[i] ?? [];
        if (templateBlocks.length === 0) continue;

        const existingBlocks = getBlocksForDate(date);
        const newBlocks: TimeBlock[] = [];

        templateBlocks.forEach((tb, idx) => {
          const hasOverlap = existingBlocks.some(
            (b) => tb.startTime < b.endTime && tb.endTime > b.startTime
          );
          if (hasOverlap) {
            // 이미 채워져 있는 시간대는 그대로 둠
            return;
          }
          newBlocks.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + idx,
            startTime: tb.startTime,
            endTime: tb.endTime,
            color: tb.color,
            categoryName: tb.categoryName,
            label: tb.label,
          });
        });

        if (newBlocks.length > 0) {
          await setBlocksForDate(date, [...existingBlocks, ...newBlocks]);
        }
      }

      alert(`"${target.name}" 템플릿을 현재 주에 적용했습니다.`);
    },
    [templates, weekDates, getBlocksForDate, setBlocksForDate]
  );

  if (isLoading) {
    return (
      <div className="weekly-time-record">
        <div className="weekly-time-record-header">
          <div className="weekly-title">
            <h2>Weekly</h2>
            <div className="weekly-range">{formatWeekLabel(currentWeekStart)}</div>
          </div>
        </div>
        <div className="weekly-loading">로딩 중…</div>
      </div>
    );
  }

  return (
    <div className="weekly-time-record">
      {showWeekPicker && (
        <div
          className="modal-overlay"
          onClick={() => setShowWeekPicker(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, width: 'min(92vw, 360px)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>주 선택</div>
              <button
                className="weekly-nav-btn"
                onClick={() => {
                  const today = new Date();
                  const todayStr: DateString = `${today.getFullYear()}-${String(
                    today.getMonth() + 1
                  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  setCurrentWeekStart(getWeekStart(today));
                  setWeekPickerDate(todayStr);
                  setShowWeekPicker(false);
                }}
                title="오늘 기준으로 이동"
              >
                이번 주
              </button>
            </div>
            <div className="modal-form">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                날짜 선택
                <input
                  type="date"
                  value={weekPickerDate}
                  onChange={(e) => setWeekPickerDate(e.target.value as DateString)}
                  className="modal-input"
                  autoFocus
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button
                className="modal-cancel"
                onClick={() => setShowWeekPicker(false)}
              >
                취소
              </button>
              <button
                className="modal-confirm"
                onClick={() => {
                  if (weekPickerDate) {
                    handlePickDate(weekPickerDate);
                  }
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplateSaveModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowTemplateSaveModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, width: 'min(92vw, 360px)' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>템플릿 저장</h3>
            <div className="modal-form">
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                템플릿 이름
                <input
                  type="text"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  className="modal-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (templateNameInput.trim()) {
                        saveCurrentWeekAsTemplate(templateNameInput);
                        setShowTemplateSaveModal(false);
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowTemplateSaveModal(false);
                    }
                  }}
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button
                className="modal-cancel"
                onClick={() => setShowTemplateSaveModal(false)}
              >
                취소
              </button>
              <button
                className="modal-confirm"
                onClick={() => {
                  if (!templateNameInput.trim()) return;
                  saveCurrentWeekAsTemplate(templateNameInput);
                  setShowTemplateSaveModal(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoutineManager && (
        <div
          className="modal-overlay"
          onClick={() => setShowRoutineManager(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: 'min(96vw, 420px)', maxHeight: '66vh', overflowY: 'auto' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>루틴 관리</h3>
            <div className="modal-form routine-manager-form">
              {routineDrafts.map((slot, index) => {
                const groupedOptions = ROUTINE_ICON_OPTIONS.reduce<Record<string, typeof ROUTINE_ICON_OPTIONS>>(
                  (acc, opt) => {
                    if (!acc[opt.group]) acc[opt.group] = [];
                    acc[opt.group].push(opt);
                    return acc;
                  },
                  {}
                );
                const CurrentIcon = ROUTINE_ICON_COMPONENTS[slot.iconId];
                const isOpen = openRoutineIconIndex === index;
                return (
                  <div key={index} className="routine-manager-row">
                    <div className="routine-manager-slot-label">루틴 {index + 1}</div>
                    <div className="routine-manager-icon-select">
                      <button
                        type="button"
                        className={`routine-manager-current-icon-btn ${isOpen ? 'open' : ''}`}
                        onClick={() =>
                          setOpenRoutineIconIndex((prev) => (prev === index ? null : index))
                        }
                        title="아이콘 선택"
                      >
                        <CurrentIcon size={16} />
                      </button>
                      {isOpen && (
                        <div className="routine-manager-icon-grid">
                          {Object.entries(groupedOptions).map(([group, opts]) => (
                            <div key={group} className="routine-manager-icon-group">
                              <div className="routine-manager-icon-group-title">{group}</div>
                              <div className="routine-manager-icon-group-list">
                                {opts.map((opt) => {
                                  const IconCompOpt = ROUTINE_ICON_COMPONENTS[opt.id];
                                  const isSelected = opt.id === slot.iconId;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      className={`routine-icon-choice ${isSelected ? 'selected' : ''}`}
                                      onClick={() => {
                                        setRoutineDrafts((prev) => {
                                          const copy = [...prev];
                                          copy[index] = { ...copy[index], iconId: opt.id };
                                          return copy;
                                        });
                                      }}
                                      title={opt.label}
                                    >
                                      <IconCompOpt size={16} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input
                      type="text"
                      className="modal-input routine-manager-name-input"
                      value={slot.label}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRoutineDrafts((prev) => {
                          const copy = [...prev];
                          copy[index] = { ...copy[index], label: value };
                          return copy;
                        });
                      }}
                      placeholder="이 루틴의 이름을 입력하세요"
                    />
                  </div>
                );
              })}
            </div>
            <div className="modal-actions" style={{ marginTop: 12 }}>
              <button
                className="modal-cancel"
                onClick={() => setShowRoutineManager(false)}
              >
                취소
              </button>
              <button
                className="modal-confirm"
                onClick={() => {
                  setRoutineConfigs(routineDrafts);
                  setShowRoutineManager(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {showTemplatePicker && (
        <div
          className="modal-overlay"
          onClick={() => setShowTemplatePicker(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 380, width: 'min(92vw, 380px)' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>템플릿 선택</h3>
            {templates.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                저장된 템플릿이 없습니다. 먼저 템플릿을 저장해 주세요.
              </p>
            ) : (
              <div
                style={{
                  maxHeight: 260,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  marginBottom: 12,
                }}
              >
                {templates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-secondary)',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        className="weekly-nav-btn"
                        style={{ padding: '4px 8px', fontSize: 11 }}
                        onClick={async () => {
                          await applyTemplateById(t.id);
                          setShowTemplatePicker(false);
                        }}
                      >
                        적용
                      </button>
                      <button
                        className="weekly-nav-btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                          borderColor: 'var(--danger-color, #f44336)',
                          color: 'var(--danger-color, #f44336)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplateToDeleteId(t.id);
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setShowTemplatePicker(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showMiniOverview && (
        <div
          className="modal-overlay"
          onClick={() => setShowMiniOverview(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: 'min(92vw, 520px)', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 }}>Weekly Overview</h3>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>
              한 주 전체의 색상 패턴을 축소해서 보여주는 미니 타임테이블입니다.
            </div>
            <div className="weekly-mini-grid" style={{ minHeight: 140, maxHeight: 340 }}>
              <div className="weekly-mini-header-row">
                <div className="weekly-mini-time-col-head">#</div>
                {weekDates.map((d) => (
                  <div key={d} className="weekly-mini-day-head">
                    {formatDateLabel(d).split(' ')[0]}
                  </div>
                ))}
              </div>
              <div className="weekly-mini-body">
                {Array.from({ length: totalSlots }, (_, slot) => (
                  <div key={slot} className="weekly-mini-row">
                    <div className="weekly-mini-time-col">
                      {slot % slotsPerHour === 0
                        ? (() => {
                            const hourIndex = Math.floor(slot / slotsPerHour);
                            const hour = startHour + hourIndex;
                            const displayHour = hour >= 24 ? hour - 24 : hour;
                            return displayHour;
                          })()
                        : ''}
                    </div>
                    {weekDates.map((date) => {
                      const block = getBlockAtCell(date, slot);
                      return (
                        <div
                          key={date + '-' + slot}
                          className="weekly-mini-cell"
                          style={{ backgroundColor: block ? block.color : 'transparent' }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: 8 }}>
              <button
                className="modal-confirm"
                onClick={() => setShowMiniOverview(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {templateToDeleteId && (
        <div
          className="modal-overlay"
          onClick={() => setTemplateToDeleteId(null)}
        >
          <div
            className="modal-content delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 360, width: 'min(92vw, 360px)' }}
          >
            <h3>템플릿 삭제</h3>
            <p>
              {`"${templates.find((t) => t.id === templateToDeleteId)?.name ?? ''}" 템플릿을 정말 삭제할까요?`}
            </p>
            <div className="modal-actions">
              <button
                className="modal-cancel"
                onClick={() => setTemplateToDeleteId(null)}
              >
                취소
              </button>
              <button
                className="modal-confirm"
                onClick={() => {
                  setTemplates((prev) => prev.filter((t) => t.id !== templateToDeleteId));
                  setTemplateToDeleteId(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="weekly-main">
        <div className="weekly-side">
          <div className="weekly-time-record-header">
            <div className="weekly-title">
              <h2>Weekly</h2>
              <div className="weekly-range">{formatWeekLabel(currentWeekStart)}</div>
            </div>
          </div>
          <div className="weekly-nav weekly-date-nav">
            <button className="weekly-nav-btn" onClick={goPrev} title="이전 주">
              <ChevronLeft size={16} />
            </button>
            <button
              className="weekly-nav-btn"
              onClick={() => {
                setWeekPickerDate(currentWeekStart);
                setShowWeekPicker(true);
              }}
              title="주 선택"
            >
              {currentWeekStart}
            </button>
            <button className="weekly-nav-btn" onClick={goNext} title="다음 주">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="weekly-nav weekly-action-nav">
            <button
              className="weekly-nav-btn"
              onClick={() => {
                const defaultName = `세트 ${templates.length + 1}`;
                setTemplateNameInput(defaultName);
                setShowTemplateSaveModal(true);
              }}
              title="현재 주를 템플릿으로 저장"
            >
              <Save size={16} />
            </button>
            <button
              className="weekly-nav-btn"
              onClick={() => {
                if (templates.length === 0) {
                  alert('저장된 템플릿이 없습니다. 먼저 템플릿을 저장해 주세요.');
                  return;
                }
                setShowTemplatePicker(true);
              }}
              title="저장된 템플릿을 이 주에 적용"
            >
              <FileDown size={16} />
            </button>
            <button
              className="weekly-nav-btn"
              onClick={() => {
                setRoutineDrafts(routineConfigs);
                setShowRoutineManager(true);
              }}
              title="루틴 관리"
            >
              <RefreshCcw size={16} />
            </button>
            <button
              className="weekly-nav-btn"
              onClick={() => setShowMiniOverview(true)}
              title="주간 오버뷰 보기"
            >
              <Map size={16} />
            </button>
          </div>
          <div className="weekly-categories">
            <button
              className={`weekly-category eraser ${selectedCategoryIndex === -1 ? 'selected' : ''}`}
              onClick={() => setSelectedCategoryIndex(-1)}
              title="지우개"
            >
              <span className="dot eraser-dot">
                <Eraser size={12} />
              </span>
              <span className="name">지우개</span>
            </button>
            {categories.map((c, idx) => (
              <button
                key={idx}
                className={`weekly-category ${selectedCategoryIndex === idx ? 'selected' : ''}`}
                onClick={() => setSelectedCategoryIndex(idx)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingCategoryIndex(idx);
                  setEditingCategoryName(c.name || `색상 ${idx + 1}`);
                }}
                title={c.name}
              >
                <span className="dot" style={{ backgroundColor: c.color }} />
                {editingCategoryIndex === idx ? (
                  <input
                    className="weekly-category-name-input"
                    value={editingCategoryName}
                    autoFocus
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={commitCategoryNameEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitCategoryNameEdit();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        setEditingCategoryIndex(null);
                        setEditingCategoryName('');
                      }
                    }}
                  />
                ) : (
                  <span className="name">{c.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="weekly-main-grid">
          <div className="weekly-grid-wrapper">
            <div className="weekly-routine-wrapper">
              <div className="weekly-routine-time-col" />
              <div className="weekly-routine-grid">
                {weekDates.map((d, dayIndex) => {
                  const dayState = currentRoutineState[dayIndex] ?? getDefaultRoutineDay();
                  return (
                    <div key={d} className="weekly-routine-day">
                      <div className="weekly-routine-row">
                        {dayState.names.map((_, idx) => (
                          <div key={idx} className="weekly-routine-cell weekly-routine-cell-icon-only">
                            {routineConfigs[idx] && (
                              <span className="weekly-routine-icon">
                                {(() => {
                                  const IconComp = ROUTINE_ICON_COMPONENTS[routineConfigs[idx].iconId];
                                  return <IconComp size={12} />;
                                })()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="weekly-routine-row">
                        {dayState.checks.map((checked, idx) => (
                          <div key={idx} className="weekly-routine-cell weekly-routine-check-cell">
                            <button
                              type="button"
                              className="weekly-routine-check"
                              onClick={() => toggleRoutineCheck(dayIndex, idx)}
                              aria-label="루틴 체크"
                            >
                              {checked && (
                                <PawPrint
                                  className="weekly-routine-check-icon checked"
                                  size={14}
                                />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="weekly-grid-header">
              <div className="weekly-time-col-head">Time</div>
              {weekDates.map((d) => {
                const label = formatDateLabel(d);
                const [weekday, md] = label.split(' ');
                return (
                  <div key={d} className="weekly-date-col-head">
                    <span className="weekly-date-weekday">{weekday}</span>
                    <span className="weekly-date-md">{md}</span>
                  </div>
                );
              })}
            </div>

            <div className="weekly-grid-body">
              <div className="weekly-time-labels">
                {hourLabels.map((h) => {
                  const displayHour = h >= 24 ? h - 24 : h;
                  return (
                    <div key={h} className="weekly-hour-label">
                      {displayHour}
                    </div>
                  );
                })}
              </div>

              <div className="weekly-grid">
                {Array.from({ length: totalSlots }, (_, slot) => {
                  const minutes = cellIndexToMinutes(slot);
                  const col = slot % slotsPerHour;
                  const isHourStart = col === 0;

                  return (
                    <div key={slot} className={`weekly-row ${isHourStart ? 'hour-start' : ''}`}>
                      {weekDates.map((date) => {
                        const block = getBlockAtCell(date, slot);
                        const isEditing = !!editingCell && editingCell.date === date && editingCell.cellIndex === slot;
                        return (
                          <div
                            key={`${date}-${minutes}`}
                            className={`weekly-cell ${block ? 'has-block' : ''} ${isDragging && dragDateRef.current === date ? 'dragging' : ''}`}
                            style={{ backgroundColor: block ? block.color : 'transparent' }}
                            onMouseDown={(e) => handleCellMouseDown(date, slot, e)}
                            onMouseEnter={(e) => handleCellMouseEnter(date, slot, e)}
                            onMouseUp={() => finishDrag()}
                            onClick={(e) => handleCellClick(date, slot, e)}
                            onContextMenu={(e) => handleCellContextMenu(date, slot, e)}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEdit(date, slot);
                            }}
                            title={block ? `${block.categoryName ?? ''}` : ''}
                          >
                            {block?.label && !isEditing && (
                              <div className="cell-label">{block.label}</div>
                            )}
                            {isEditing && (
                              <input
                                className="cell-input"
                                value={editingValue}
                                autoFocus
                                onChange={(e) => setEditingValue(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => { commitEdit(); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitEdit();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelEdit();
                                  }
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



