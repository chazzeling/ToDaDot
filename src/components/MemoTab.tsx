import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DateString, Memo, Diary } from '../types';
import MoodColorPicker from './MoodColorPicker';
import TextFormatToolbar from './TextFormatToolbar';
import RichTextEditor from './RichTextEditor';
import { Palette, Book, StickyNote, Pin, PinOff } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import * as diaryService from '../firebase/diaryService';
import './MemoTab.css';

interface MemoTabProps {
  selectedDate: DateString;
  onDateSelect: (date: DateString) => void;
  moods: { date: string; color: string }[];
  onMoodSelect: (date: DateString, color: string) => void;
  datesWithDiaries?: DateString[];
  onDayOfWeekSelect?: (dayIndex: number | null) => void;
  selectedDayOfWeek?: number | null;
}

type Mode = 'memo' | 'diary';

export default function MemoTab({ 
  selectedDate, 
  onDateSelect,
  moods,
  onMoodSelect,
  datesWithDiaries = [],
  onDayOfWeekSelect,
  selectedDayOfWeek: externalSelectedDayOfWeek,
}: MemoTabProps) {
  const [mode, setMode] = useState<Mode>('memo'); // Diary 기능 제거됨 - 항상 memo 모드만 사용
  const [memos, setMemos] = useState<Memo[]>([]);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newMemoContent, setNewMemoContent] = useState('');
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDiaryConfirm, setDeleteDiaryConfirm] = useState<string | null>(null);
  const [deleteMemoConfirm, setDeleteMemoConfirm] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedMoodDate, setSelectedMoodDate] = useState<DateString>(selectedDate);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [showAllItems, setShowAllItems] = useState(true);
  const [selectedDateFilter, setSelectedDateFilter] = useState<DateString | null>(null);
  const selectedDayOfWeek = externalSelectedDayOfWeek !== undefined ? externalSelectedDayOfWeek : null;
  const memoInputRef = useRef<HTMLDivElement>(null);
  const diaryInputRef = useRef<HTMLDivElement>(null);
  const editEditorRef = useRef<HTMLDivElement>(null);
  
  const { user, isAuthenticated } = useFirebaseAuth();

  // Firestore에서 메모/일기 불러오기 (Firebase 인증된 경우)
  useEffect(() => {
    const loadData = async () => {
      if (isAuthenticated && user) {
        try {
          // 먼저 로컬 데이터 불러오기
          const localMemos = loadMemosFromLocalStorage();
          const localDiaries = loadDiariesFromLocalStorage();
          
          // Firestore에서 일기 불러오기
          const loadedDiaries = await diaryService.getAllDiaries();
          
          // Firestore에서 메모 불러오기
          const loadedMemos = await diaryService.getAllMemos();
          
          // 로컬 데이터와 Firestore 데이터 병합 (로컬 데이터 우선)
          const mergedDiaries = mergeData(localDiaries, loadedDiaries);
          const mergedMemos = mergeData(localMemos, loadedMemos);
          
          setDiaries(mergedDiaries);
          setMemos(mergedMemos);
          
          // 마이그레이션은 사용자가 팝업에서 확인한 후에만 실행
          // (App.tsx에서 handleImportLocalData로 처리)
          // 여기서는 데이터만 병합하여 표시
          
          // 병합된 데이터를 localStorage에 저장 (로컬 데이터 보존)
          // Firestore에 데이터가 없어도 로컬 데이터는 유지됨
          if (mergedMemos.length > 0 || localMemos.length > 0) {
            localStorage.setItem('memos', JSON.stringify(mergedMemos));
          }
          if (mergedDiaries.length > 0 || localDiaries.length > 0) {
            localStorage.setItem('diaries', JSON.stringify(mergedDiaries));
          }
        } catch (error) {
          console.error('Failed to load data from Firestore:', error);
          // Firestore 로드 실패 시 LocalStorage에서 폴백
          loadFromLocalStorage();
        }
      } else {
        // Firebase 인증되지 않은 경우 LocalStorage 사용
        loadFromLocalStorage();
      }
    };
    
    loadData();
  }, [isAuthenticated, user]);
  
  // 로컬 스토리지에서 메모 불러오기
  const loadMemosFromLocalStorage = (): Memo[] => {
    try {
      const savedMemos = localStorage.getItem('memos');
      if (savedMemos) {
        return JSON.parse(savedMemos);
      }
    } catch (e) {
      console.error('Failed to load memos from localStorage:', e);
    }
    return [];
  };
  
  // 로컬 스토리지에서 일기 불러오기
  const loadDiariesFromLocalStorage = (): Diary[] => {
    try {
      const savedDiaries = localStorage.getItem('diaries');
      if (savedDiaries) {
        return JSON.parse(savedDiaries);
      }
    } catch (e) {
      console.error('Failed to load diaries from localStorage:', e);
    }
    return [];
  };
  
  // 데이터 병합 (로컬 데이터 우선, Firestore에 없는 항목만 추가)
  const mergeData = <T extends { id: string }>(local: T[], firestore: T[]): T[] => {
    const firestoreMap = new Map(firestore.map(item => [item.id, item]));
    const merged = [...firestore];
    
    // 로컬에만 있는 항목 추가
    local.forEach(localItem => {
      if (!firestoreMap.has(localItem.id)) {
        merged.push(localItem);
      }
    });
    
    return merged;
  };
  
  // 로컬 데이터를 Firestore로 마이그레이션
  const migrateLocalToFirebase = async (
    localDiaries: Diary[],
    localMemos: Memo[],
    firestoreDiaries: Diary[],
    firestoreMemos: Memo[]
  ) => {
    try {
      // 이미 마이그레이션 완료 확인
      const syncCompleted = localStorage.getItem('firebase-diaries-memos-sync-completed');
      if (syncCompleted === 'true') {
        return;
      }
      
      // Firestore에 없는 로컬 데이터만 마이그레이션
      const firestoreDiaryIds = new Set(firestoreDiaries.map(d => d.id));
      const firestoreMemoIds = new Set(firestoreMemos.map(m => m.id));
      
      const diariesToMigrate = localDiaries.filter(d => !firestoreDiaryIds.has(d.id));
      const memosToMigrate = localMemos.filter(m => !firestoreMemoIds.has(m.id));
      
      if (diariesToMigrate.length > 0) {
        await diaryService.saveDiariesBatch(diariesToMigrate);
        console.log(`✅ Migrated ${diariesToMigrate.length} diaries to Firebase`);
      }
      
      if (memosToMigrate.length > 0) {
        await diaryService.saveMemosBatch(memosToMigrate);
        console.log(`✅ Migrated ${memosToMigrate.length} memos to Firebase`);
      }
      
      if (diariesToMigrate.length > 0 || memosToMigrate.length > 0) {
        localStorage.setItem('firebase-diaries-memos-sync-completed', 'true');
      } else {
        // 로컬에 데이터가 없거나 이미 모두 마이그레이션된 경우
        localStorage.setItem('firebase-diaries-memos-sync-completed', 'true');
      }
    } catch (error) {
      console.error('Failed to migrate local data to Firebase:', error);
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const savedMemos = localStorage.getItem('memos');
      if (savedMemos) {
        const parsedMemos = JSON.parse(savedMemos);
        // 고정 상태가 제대로 로드되었는지 확인
        console.log('Loaded memos from localStorage with pin status:', parsedMemos.map((m: Memo) => ({ id: m.id, isPinned: m.isPinned, pinnedDayOfWeek: m.pinnedDayOfWeek })));
        setMemos(parsedMemos);
      }
      
      const savedDiaries = localStorage.getItem('diaries');
      if (savedDiaries) {
        setDiaries(JSON.parse(savedDiaries));
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  };

  // 무드 트래커 팝업 표시 (일기 모드에서만 사용)
  // useEffect 제거 - 버튼 클릭 시에만 표시

  // 무드 색상 선택 및 저장
  const handleMoodColorSelect = (color: string) => {
    setSelectedColor(color);
  };

  // 무드 저장 버튼 클릭
  const handleSaveMood = (date: DateString, color: string) => {
    if (color) {
      onMoodSelect(date, color);
      setShowMoodPicker(false);
      setSelectedColor('');
    }
  };

  // 무드 트래커 아이콘 클릭 핸들러
  const handleMoodTrackerClick = () => {
    setShowMoodPicker(!showMoodPicker);
    setSelectedMoodDate(selectedDate);
  };

  // 메모 생성
  const handleCreateMemo = async () => {
    const textContent = newMemoContent.replace(/<[^>]*>/g, '').trim();
    if (!textContent) return;

    const newMemo: Memo = {
      id: `memo-${Date.now()}-${Math.random()}`,
      date: selectedDate,
      content: newMemoContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Firestore에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        await diaryService.saveMemo(newMemo);
        // 저장 후 목록 다시 불러오기
        const loadedMemos = await diaryService.getAllMemos();
        setMemos(loadedMemos);
      } catch (error) {
        console.error('Failed to save memo to Firestore:', error);
        // 실패해도 로컬 상태는 업데이트
        setMemos([...memos, newMemo]);
      }
    } else {
      // LocalStorage에 저장
      const updatedMemos = [...memos, newMemo];
      localStorage.setItem('memos', JSON.stringify(updatedMemos));
      setMemos(updatedMemos);
    }

    setNewMemoContent('');
  };

  // 일기 생성
  const handleCreateDiary = async () => {
    const textContent = newDiaryContent.replace(/<[^>]*>/g, '').trim();
    if (!textContent) return;

    const newDiary: Diary = {
      id: `diary-${Date.now()}-${Math.random()}`,
      date: selectedDate,
      content: newDiaryContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Firestore에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        await diaryService.saveDiary(newDiary);
        // 저장 후 목록 다시 불러오기
        const loadedDiaries = await diaryService.getAllDiaries();
        setDiaries(loadedDiaries);
      } catch (error) {
        console.error('Failed to save diary to Firestore:', error);
        // 실패해도 로컬 상태는 업데이트
        setDiaries([...diaries, newDiary]);
      }
    } else {
      // LocalStorage에 저장
      const updatedDiaries = [...diaries, newDiary];
      localStorage.setItem('diaries', JSON.stringify(updatedDiaries));
      setDiaries(updatedDiaries);
    }

    setNewDiaryContent('');
  };

  // 메모 수정 시작
  const handleStartEdit = (item: Memo | Diary) => {
    setEditingId(item.id);
    setEditContent(item.content);
  };

  // 메모 수정 저장
  const handleSaveEdit = async () => {
    const textContent = editContent.replace(/<[^>]*>/g, '').trim();
    if (!textContent || !editingId) return;

    if (mode === 'memo') {
      const updatedMemo = memos.find(m => m.id === editingId);
      if (!updatedMemo) return;

      const newMemo = { ...updatedMemo, content: editContent, updatedAt: Date.now() };
      
      // Firestore에 저장 (인증된 경우)
      if (isAuthenticated && user) {
        try {
          await diaryService.saveMemo(newMemo);
          // Firestore에서 최신 목록 다시 불러오기
          const loadedMemos = await diaryService.getAllMemos();
          setMemos(loadedMemos);
          // localStorage도 동기화
          localStorage.setItem('memos', JSON.stringify(loadedMemos));
        } catch (error) {
          console.error('Failed to update memo in Firestore:', error);
          // 실패해도 로컬 상태는 업데이트
          const updatedMemos = memos.map(memo =>
            memo.id === editingId ? newMemo : memo
          );
          setMemos(updatedMemos);
          localStorage.setItem('memos', JSON.stringify(updatedMemos));
        }
      } else {
        // LocalStorage에 저장
        const updatedMemos = memos.map(memo =>
          memo.id === editingId ? newMemo : memo
        );
        setMemos(updatedMemos);
        localStorage.setItem('memos', JSON.stringify(updatedMemos));
      }
    } else if (mode === 'diary') {
      const updatedDiary = diaries.find(d => d.id === editingId);
      if (!updatedDiary) return;

      const newDiary = { ...updatedDiary, content: editContent, updatedAt: Date.now() };
      
      // Firestore에 저장 (인증된 경우)
      if (isAuthenticated && user) {
        try {
          await diaryService.saveDiary(newDiary);
        } catch (error) {
          console.error('Failed to update diary in Firestore:', error);
        }
      } else {
        // LocalStorage에 저장
        const updatedDiaries = diaries.map(diary =>
          diary.id === editingId ? newDiary : diary
        );
        localStorage.setItem('diaries', JSON.stringify(updatedDiaries));
      }

      setDiaries(diaries.map(diary =>
        diary.id === editingId ? newDiary : diary
      ));
    }

    setEditingId(null);
    setEditContent('');
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 메모 삭제
  const handleDeleteMemo = (id: string) => {
    setDeleteMemoConfirm(id);
  };

  const confirmDeleteMemo = async () => {
    if (!deleteMemoConfirm) return;
    
    // Firestore에서 삭제 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        await diaryService.deleteMemo(deleteMemoConfirm);
        // 삭제 후 목록 다시 불러오기
        const loadedMemos = await diaryService.getAllMemos();
        setMemos(loadedMemos);
        // localStorage도 동기화 (삭제된 메모 제거)
        localStorage.setItem('memos', JSON.stringify(loadedMemos));
      } catch (error) {
        console.error('Failed to delete memo from Firestore:', error);
        // 실패해도 로컬 상태는 업데이트
        const updatedMemos = memos.filter(m => m.id !== deleteMemoConfirm);
        setMemos(updatedMemos);
        localStorage.setItem('memos', JSON.stringify(updatedMemos));
      }
    } else {
      // LocalStorage에서 삭제
      const updatedMemos = memos.filter(m => m.id !== deleteMemoConfirm);
      setMemos(updatedMemos);
      localStorage.setItem('memos', JSON.stringify(updatedMemos));
    }
    
    setDeleteMemoConfirm(null);
  };

  // 일기 삭제
  const handleDeleteDiary = (id: string) => {
    setDeleteDiaryConfirm(id);
  };

  const confirmDeleteDiary = async () => {
    if (!deleteDiaryConfirm) return;
    
    // Firestore에서 삭제 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        await diaryService.deleteDiary(deleteDiaryConfirm);
        // 삭제 후 목록 다시 불러오기
        const loadedDiaries = await diaryService.getAllDiaries();
        setDiaries(loadedDiaries);
      } catch (error) {
        console.error('Failed to delete diary from Firestore:', error);
        // 실패해도 로컬 상태는 업데이트
        setDiaries(diaries.filter(d => d.id !== deleteDiaryConfirm));
      }
    } else {
      // LocalStorage에서 삭제
      const updatedDiaries = diaries.filter(d => d.id !== deleteDiaryConfirm);
      setDiaries(updatedDiaries);
      localStorage.setItem('diaries', JSON.stringify(updatedDiaries));
    }
    
    setDeleteDiaryConfirm(null);
  };

  // 날짜에서 요일 추출 (0=일요일, 1=월요일, ...)
  const getDayOfWeek = useCallback((dateString: DateString): number => {
    const date = new Date(dateString);
    return date.getDay();
  }, []);

  // 메모 고정/고정 해제
  const handleTogglePinMemo = async (memoId: string) => {
    const memo = memos.find(m => m.id === memoId);
    if (!memo) return;

    // 고정 상태 토글 (요일과 관계없이)
    const updatedMemo: Memo = {
      ...memo,
      isPinned: !memo.isPinned,
      pinnedDayOfWeek: !memo.isPinned ? getDayOfWeek(selectedDate) : undefined, // 참고용으로만 저장
      updatedAt: Date.now(),
    };

    // Firestore에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        await diaryService.saveMemo(updatedMemo);
        // 저장 후 목록 다시 불러오기
        const loadedMemos = await diaryService.getAllMemos();
        setMemos(loadedMemos);
      } catch (error) {
        console.error('Failed to update memo in Firestore:', error);
        // 실패해도 로컬 상태는 업데이트
        const updatedMemos = memos.map(m => m.id === memoId ? updatedMemo : m);
        setMemos(updatedMemos);
        localStorage.setItem('memos', JSON.stringify(updatedMemos));
      }
    } else {
      // LocalStorage에 저장
      const updatedMemos = memos.map(m => m.id === memoId ? updatedMemo : m);
      setMemos(updatedMemos);
      localStorage.setItem('memos', JSON.stringify(updatedMemos));
    }
  };

  // 마크다운 스타일 포맷팅을 HTML로 변환
  const formatText = useCallback((text: string): string => {
    if (!text) return '';
    
    let formatted = text;
    
    // 글씨 크기: [size=16]text[/size] (먼저 처리)
    formatted = formatted.replace(/\[size=(\d+)\](.*?)\[\/size\]/g, '<span style="font-size: $1px">$2</span>');
    
    // 볼드: **text** (먼저 처리)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 취소선: ~~text~~
    formatted = formatted.replace(/~~(.*?)~~/g, '<del style="text-decoration: line-through">$1</del>');
    
    // 이탤릭: *text* (볼드가 아닌 단일 별표) - lookbehind 대신 다른 방법 사용
    // 볼드 처리 후 남은 단일 별표만 이탤릭으로 처리
    formatted = formatted.replace(/([^*]|^)\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3');
    
    // 줄바꿈
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  }, []);

  // 현재 모드에 따른 아이템 목록
  const currentItems = mode === 'memo' ? memos : diaries;

  // 검색 및 정렬된 아이템 목록
  const filteredAndSortedItems = useMemo(() => {
    let filtered: (Memo | Diary)[] = [];

    // 메모 모드일 때만 고정된 메모 처리
    if (mode === 'memo') {
      // 1. 먼저 고정된 메모를 모두 찾아서 추가 (요일과 관계없이)
      const pinnedMemos = memos.filter(memo => 
        memo.isPinned === true
      );
      
      // 고정된 메모를 먼저 추가 (검색 필터만 적용)
      if (pinnedMemos.length > 0) {
        if (searchQuery.trim()) {
          const filteredPinned = pinnedMemos.filter(memo =>
            memo.content.toLowerCase().includes(searchQuery.toLowerCase())
          );
          filtered.push(...filteredPinned);
        } else {
          filtered.push(...pinnedMemos);
        }
      }

      // 2. 일반 메모 필터링 (고정된 메모 제외)
      let regularMemos = memos.filter(memo => {
        // 고정된 메모는 이미 추가했으므로 제외
        return !memo.isPinned;
      });

      // 날짜 필터 적용
      if (selectedDateFilter) {
        regularMemos = regularMemos.filter(memo => memo.date === selectedDateFilter);
      }

      // 검색 필터 적용
      if (searchQuery.trim()) {
        regularMemos = regularMemos.filter(memo =>
          memo.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // 요일 필터 적용 (날짜 필터가 없을 때만)
      if (!showAllItems && selectedDayOfWeek !== null && !selectedDateFilter) {
        regularMemos = regularMemos.filter(memo => {
          const dayOfWeek = getDayOfWeek(memo.date);
          return dayOfWeek === selectedDayOfWeek;
        });
      }

      filtered.push(...regularMemos);
    } else {
      // 일기 모드: 기존 로직 유지
      filtered = currentItems;

      // 날짜 필터
      if (selectedDateFilter) {
        filtered = filtered.filter(item => item.date === selectedDateFilter);
      }

      // 검색 필터
      if (searchQuery.trim()) {
        filtered = filtered.filter(item =>
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // 요일 필터
      if (!showAllItems && selectedDayOfWeek !== null && !selectedDateFilter) {
        filtered = filtered.filter(item => {
          const dayOfWeek = getDayOfWeek(item.date);
          return dayOfWeek === selectedDayOfWeek;
        });
      }
    }

    // 정렬: 고정된 메모가 가장 앞에, 그 다음 날짜별 정렬
    const sorted = [...filtered].sort((a, b) => {
      // 메모 모드일 때만 고정된 메모 우선 정렬
      if (mode === 'memo') {
        const aIsPinned = (a as Memo).isPinned === true;
        const bIsPinned = (b as Memo).isPinned === true;
        
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
      }
      
      // 날짜별 정렬
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return sorted;
  }, [currentItems, searchQuery, sortOrder, showAllItems, selectedDayOfWeek, selectedDateFilter, getDayOfWeek, mode, memos, selectedDate]);

  // 일기가 있는 날짜 목록
  const datesWithDiariesLocal = useMemo(() => {
    return Array.from(new Set(diaries.map(diary => diary.date)));
  }, [diaries]);

  // 전체 보기 버튼 클릭
  const handleShowAll = () => {
    setShowAllItems(true);
    setSelectedDateFilter(null);
    if (onDayOfWeekSelect) {
      onDayOfWeekSelect(null);
    }
  };

  // 날짜 클릭 핸들러
  useEffect(() => {
    // selectedDate가 변경되면 필터링
    if (selectedDate) {
      setSelectedDateFilter(selectedDate);
      setShowAllItems(false);
    }
  }, [selectedDate]);

  // 외부에서 요일 선택 시 showAllItems 업데이트
  useEffect(() => {
    if (externalSelectedDayOfWeek !== undefined) {
      if (externalSelectedDayOfWeek === null) {
        setShowAllItems(true);
      } else {
        setShowAllItems(false);
      }
    }
  }, [externalSelectedDayOfWeek]);

  return (
    <div className="memo-tab">
      {/* Diary 기능 제거됨 - Memo만 표시 */}
      {(mode === 'memo') && (
        <>
          <div className="memo-tab-header">
            <h2>Memo</h2>
            <div style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)', 
              marginTop: '4px',
              marginBottom: '12px'
            }}>
              선택된 날짜: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="memo-controls">
              <button
                onClick={handleShowAll}
                className="show-all-btn"
                style={{
                  padding: '8px 16px',
                  background: showAllItems ? 'var(--sub-color)' : 'var(--bg-secondary)',
                  color:'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                전체 메모 보기
              </button>
              <input
                type="text"
                placeholder="검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="memo-search-input"
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="memo-sort-select"
              >
                <option value="asc">날짜 오름차순</option>
                <option value="desc">날짜 내림차순</option>
              </select>
            </div>
          </div>

          {/* 새 아이템 생성 */}
          <div className="memo-create-section">
            <TextFormatToolbar
              editorRef={mode === 'memo' ? memoInputRef : diaryInputRef}
            />
            <div className="memo-create-input-wrapper">
              <RichTextEditor
                ref={mode === 'memo' ? memoInputRef : diaryInputRef}
                value={mode === 'memo' ? newMemoContent : newDiaryContent}
                onChange={(html, text) => {
                  if (mode === 'memo') {
                    setNewMemoContent(html);
                  } else {
                    setNewDiaryContent(html);
                  }
                }}
                placeholder={mode === 'memo' ? '새 메모를 입력하세요!' : '새 일기를 입력하세요!'}
                className={`memo-input ${mode === 'memo' ? 'memo-input-narrow' : ''}`}
                rows={mode === 'memo' ? 2 : 4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    if (mode === 'memo') {
                      handleCreateMemo();
                    } else {
                      handleCreateDiary();
                    }
                  }
                }}
              />
            </div>
            <button
              onClick={mode === 'memo' ? handleCreateMemo : handleCreateDiary}
              disabled={mode === 'memo' ? !newMemoContent.replace(/<[^>]*>/g, '').trim() : !newDiaryContent.replace(/<[^>]*>/g, '').trim()}
              className="memo-create-btn"
            >
              저장 (Ctrl+Enter)
            </button>
          </div>


          {/* 아이템 목록 */}
          {mode === 'memo' ? (
            <div className="memo-grid">
              {filteredAndSortedItems.length === 0 ? (
                <p className="no-memos">
                  {searchQuery ? '검색 결과가 없습니다.' : '메모가 없습니다.'}
                </p>
              ) : (
                filteredAndSortedItems.map((item) => {
                  const memo = item as Memo;
                  const isPinned = memo.isPinned === true;
                  return (
                  <div key={item.id} className={`memo-sticky-note ${isPinned ? 'pinned' : ''}`}>
                    <div className="memo-sticky-header">
                      <div className="memo-date-small">
                        {isPinned && <Pin size={14} style={{ marginRight: '4px', color: 'var(--accent-color)' }} />}
                        {item.date}
                      </div>
                      <div className="memo-sticky-actions">
                        {editingId === item.id ? (
                          <>
                            <button onClick={handleSaveEdit} className="memo-save-btn-small" title="저장">
                              ✓
                            </button>
                            <button onClick={handleCancelEdit} className="memo-cancel-btn-small" title="취소">
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleTogglePinMemo(item.id)}
                              className={`memo-pin-btn-small ${isPinned ? 'pinned' : ''}`}
                              title={isPinned ? '고정 해제' : '고정'}
                              style={{
                                color: isPinned ? 'var(--accent-color)' : 'var(--text-secondary)',
                              }}
                            >
                              {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
                            </button>
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="memo-edit-btn-small"
                              title="수정"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteMemo(item.id)}
                              className="memo-delete-btn-small"
                              title="삭제"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingId === item.id ? (
                      <>
                        <TextFormatToolbar
                          editorRef={editEditorRef}
                        />
                        <RichTextEditor
                          ref={editEditorRef}
                          value={editContent}
                          onChange={(html, text) => setEditContent(html)}
                          className="memo-sticky-textarea"
                          rows={6}
                          autoFocus
                        />
                      </>
                    ) : (
                      <div className="memo-sticky-content" dangerouslySetInnerHTML={{ __html: item.content }}></div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="memo-list">
              {filteredAndSortedItems.length === 0 ? (
                <p className="no-memos">
                  {searchQuery ? '검색 결과가 없습니다.' : '일기가 없습니다.'}
                </p>
              ) : (
                filteredAndSortedItems.map((item) => (
                  <div key={item.id} className="memo-item">
                    <div className="memo-date">
                      {item.date}
                    </div>
                    {editingId === item.id ? (
                      <div className="memo-edit">
                        <TextFormatToolbar
                          editorRef={editEditorRef}
                        />
                        <RichTextEditor
                          ref={editEditorRef}
                          value={editContent}
                          onChange={(html, text) => setEditContent(html)}
                          className="memo-input"
                          rows={4}
                          autoFocus
                        />
                        <div className="memo-edit-actions">
                          <button onClick={handleSaveEdit} className="memo-save-btn">
                            저장
                          </button>
                          <button onClick={handleCancelEdit} className="memo-cancel-btn">
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="memo-content" dangerouslySetInnerHTML={{ __html: item.content }}></div>
                        <div className="memo-actions">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="memo-edit-btn"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteDiary(item.id)}
                            className="memo-delete-btn"
                          >
                            삭제
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* 일기 삭제 확인 모달 */}
      {deleteDiaryConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteDiaryConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>일기 삭제</h3>
            <p>정말 삭제할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteDiaryConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={confirmDeleteDiary}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메모 삭제 확인 모달 */}
      {deleteMemoConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteMemoConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>메모 삭제</h3>
            <p>정말 삭제할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteMemoConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={confirmDeleteMemo}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 메모가 있는 날짜 목록을 반환하는 함수
export function getDatesWithMemos(): DateString[] {
  const savedMemos = localStorage.getItem('memos');
  if (!savedMemos) return [];
  
  try {
    const memos: Memo[] = JSON.parse(savedMemos);
    // 실제로 내용이 있는 메모만 필터링 (빈 메모 제외)
    const validMemos = memos.filter(memo => {
      if (!memo.content) return false;
      // HTML 태그 제거 후 텍스트만 확인
      const textContent = memo.content.replace(/<[^>]*>/g, '').trim();
      return textContent.length > 0;
    });
    return Array.from(new Set(validMemos.map(memo => memo.date)));
  } catch (e) {
    return [];
  }
}

// 일기가 있는 날짜 목록을 반환하는 함수
export function getDatesWithDiaries(): DateString[] {
  const savedDiaries = localStorage.getItem('diaries');
  if (!savedDiaries) return [];
  
  try {
    const diaries: Diary[] = JSON.parse(savedDiaries);
    return Array.from(new Set(diaries.map(diary => diary.date)));
  } catch (e) {
    return [];
  }
}
