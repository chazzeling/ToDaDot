import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as todoService from './firebase/todoService';
import Calendar from './components/Calendar';
import QuadrantTab from './components/QuadrantTab';
import CategoryTab from './components/CategoryTab';
import EventTab from './components/EventTab';
import DailyFocusTab from './components/DailyFocusTab';
import RoutineTab from './components/RoutineTab';
import TimePlannerPanel from './components/TimePlannerPanel';
import TimeRecordPanel from './components/TimeRecordPanel';
import MonthlyGoalPanel from './components/MonthlyGoalPanel';
import BottomSheet from './components/BottomSheet';
import MemoTab from './components/MemoTab';
import DiaryTab from './components/DiaryTab';
import { getDatesWithMemos, getDatesWithDiaries } from './components/MemoTab';
import { getDatesWithDiaryContent } from './components/DiaryTab';
import GoogleApiSettings from './components/GoogleApiSettings';
import HeaderImageEditor from './components/HeaderImageEditor';
import StylingManager from './components/StylingManager';
import FloatingToolbar from './components/FloatingToolbar';
import StickerOverlayComponent from './components/StickerOverlayComponent';
import { useTodos } from './hooks/useTodos';
import { useRoutines } from './hooks/useRoutines';
import { useCategories } from './hooks/useCategories';
import { useEventCategories } from './hooks/useEventCategories';
import { useEvents } from './hooks/useEvents';
import { useMoodTracker } from './hooks/useMoodTracker';
import { useStickerStore } from './store/stickerStore';
import { Event, Sticker, StickerLayout, TodoItem, DateString } from './types';
import { Palette, Settings, Sparkles, HelpCircle, BadgeCheck, Grid2x2, LayoutList, Reply, Spotlight, NotebookPen, FileUp, LogIn, LogOut, User } from 'lucide-react';
import ExportPreviewModal from './components/ExportPreviewModal';
import ConfirmDialog from './components/ConfirmDialog';
import LoginModal from './components/LoginModal';
import NicknameEditor from './components/NicknameEditor';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { exportToPDF } from './utils/pdfExport';
import { exportToPNG } from './utils/imageExport';
import * as diaryService from './firebase/diaryService';
import './App.css';

function App() {
  const {
    todos,
    selectedDate,
    setSelectedDate,
    getTodosForDate,
    addTodoByQuadrant,
    addTodoByCategory,
    addTodoFromBottomSheet,
    toggleTodo,
    deleteTodo,
    moveTodoToQuadrant,
    moveTodoToCategory,
    reorderTodoInQuadrant,
    reorderTodoInCategory,
    editTodoText,
    changeTodoDate,
    updateTodoMemo,
    deleteTodoMemo,
    setTodoTime,
    deleteTodoTime,
    getTodayDateString,
    getTomorrowDateString,
    moveIncompleteTodosToTomorrow,
    moveIncompleteTodosToToday,
    moveIncompleteTodosToDate,
    deleteIncompleteTodos,
    deleteAllTodos,
    toggleTodayFocus,
    reorderFocusTodos,
    resetTodayFocus,
    organizeFocusTodos,
    organizeTodosInQuadrant,
    organizeTodosInCategory,
    getTodayFocusTodos,
    duplicateTodoToday,
    duplicateTodoToDate,
    addTodoWithId,
  } = useTodos();

  const { categories, createCategory, updateCategory, deleteCategory: deleteCategoryOriginal, reorderCategories } = useCategories();
  
  // 고아 할 일 강제 진단 함수 (Firebase에서 직접 쿼리)
  const diagnoseOrphanTodos = useCallback(async () => {
    // Firebase 인증 확인 (getCurrentUser 사용)
    const { getCurrentUser } = await import('./firebase/firebase');
    const currentUser = getCurrentUser();
    const isAuthenticated = !!currentUser;
    
    const validCategoryIds = categories.map(cat => cat.id);
    let allTodosToCheck = todos;
    
    // Firebase에서 직접 쿼리 (인증된 경우)
    if (isAuthenticated) {
      try {
        const allTodosFromFirebase = await todoService.getAllTodos();
        allTodosToCheck = allTodosFromFirebase;
      } catch (error) {
        console.error('❌ Firebase 쿼리 실패, 로컬 데이터 사용:', error);
      }
    }
    
    const orphanedTodos = allTodosToCheck.filter(todo => {
      // 🔒 루틴 인스턴스는 절대 삭제하지 않음 (템플릿 삭제와 무관하게 보존되어야 함)
      if (todo.id.startsWith('routine-')) {
        return false;
      }
      
      // quadrant가 있는데
      if (todo.quadrant) {
        // categoryId가 없거나
        if (!todo.categoryId) {
          return true; // 고아 할 일
        }
        // categoryId가 'uncategorized'가 아니고, 유효한 카테고리 ID도 아닌 경우
        if (todo.categoryId !== 'uncategorized' && !validCategoryIds.includes(todo.categoryId)) {
          return true; // 고아 할 일
        }
      }
      return false;
    });
    
    return orphanedTodos;
  }, [todos, categories]);
  
  // 고아 할 일 클린업 후 개수 확인 함수
  const verifyTodoCounts = useCallback(() => {
    const matrixIncomplete = todos.filter(t => !t.completed).length;
    const matrixComplete = todos.filter(t => t.completed).length;
    const categoryIncomplete = todos.filter(t => !t.completed).length;
    const categoryComplete = todos.filter(t => t.completed).length;
    
    console.log(`📊 할 일 개수 확인:`);
    console.log(`  - 매트릭스 탭: 미완료 ${matrixIncomplete}개, 완료 ${matrixComplete}개`);
    console.log(`  - 카테고리 탭: 미완료 ${categoryIncomplete}개, 완료 ${categoryComplete}개`);
    console.log(`  - 전체: ${todos.length}개`);
    
    const isMatched = matrixIncomplete === categoryIncomplete && matrixComplete === categoryComplete;
    if (isMatched) {
      console.log(`✅ 매트릭스와 카테고리 탭의 할 일 개수가 일치합니다!`);
    } else {
      console.log(`❌ 매트릭스와 카테고리 탭의 할 일 개수가 불일치합니다.`);
    }
    
    return { matrixIncomplete, matrixComplete, categoryIncomplete, categoryComplete, isMatched };
  }, [todos]);
  
  // 고아 할 일 강제 삭제 클린업 함수 (진단 + 삭제 + 확인)
  const cleanOrphanTodos = useCallback(async () => {
    console.log('🧹 고아 할 일 클린업 시작...');
    const orphanedTodos = await diagnoseOrphanTodos();
    
    console.log(`🗑️ ${orphanedTodos.length}개의 고아 할 일 삭제 시작...`);
    let deletedCount = 0;
    
    for (const todo of orphanedTodos) {
      try {
        await deleteTodo(todo.id);
        deletedCount++;
        console.log(`  ✅ 삭제 완료: ${todo.text}`);
      } catch (error) {
        console.error(`  ❌ 삭제 실패: ${todo.text}`, error);
      }
    }
    
    console.log(`✅ 클린업 완료: ${deletedCount}/${orphanedTodos.length}개 삭제됨`);
    
    // 삭제 후 개수 확인
    setTimeout(() => {
      const counts = verifyTodoCounts();
      console.log(`\n📋 최종 보고:`);
      console.log(`  - 고아 할 일 ${deletedCount}개를 삭제했습니다.`);
      console.log(`  - 현재 매트릭스/카테고리 탭의 할 일 개수는 ${todos.length}개로 ${counts.isMatched ? '일치' : '불일치'}합니다.`);
    }, 1000);
    
    return deletedCount;
  }, [diagnoseOrphanTodos, deleteTodo, verifyTodoCounts, todos.length]);
  
  // 전역 함수로 노출
  useEffect(() => {
    (window as any).diagnoseOrphanTodos = diagnoseOrphanTodos;
    (window as any).cleanOrphanTodos = cleanOrphanTodos;
    (window as any).verifyTodoCounts = verifyTodoCounts;
    return () => {
      delete (window as any).diagnoseOrphanTodos;
      delete (window as any).cleanOrphanTodos;
      delete (window as any).verifyTodoCounts;
    };
  }, [diagnoseOrphanTodos, cleanOrphanTodos, verifyTodoCounts]);
  
  // 앱 시작 시 자동으로 고아 할 일 정리
  useEffect(() => {
    if (todos.length > 0 && categories.length > 0) {
      const validCategoryIds = categories.map(cat => cat.id);
      const orphanedCount = todos.filter(todo => {
        // 🔒 루틴 인스턴스는 절대 삭제하지 않음 (템플릿 삭제와 무관하게 보존되어야 함)
        if (todo.id.startsWith('routine-')) {
          return false;
        }
        
        if (todo.quadrant) {
          if (!todo.categoryId) return true;
          if (todo.categoryId !== 'uncategorized' && !validCategoryIds.includes(todo.categoryId)) {
            return true;
          }
        }
        return false;
      }).length;
      
      if (orphanedCount > 0) {
        console.log(`⚠️ 고아 할 일 ${orphanedCount}개 발견.`);
        console.log(`   진단: window.diagnoseOrphanTodos()`);
        console.log(`   삭제: window.cleanOrphanTodos()`);
      }
    }
  }, [todos, categories]);
  
  // 카테고리 삭제 시 해당 카테고리의 할 일도 함께 삭제
  // 그리고 매트릭스/카테고리 태그가 모두 붙어있지 않은 할 일도 삭제
  const deleteCategory = useCallback((categoryId: string) => {
    console.log(`🗑️ 카테고리 삭제 시작: ${categoryId}`);
    
    // 1. 해당 카테고리를 가진 모든 할 일 삭제
    const todosToDelete = todos.filter(todo => todo.categoryId === categoryId);
    console.log(`  - 해당 카테고리 할 일 ${todosToDelete.length}개 삭제`);
    todosToDelete.forEach(todo => {
      deleteTodo(todo.id);
    });
    
    // 2. 카테고리 삭제
    deleteCategoryOriginal(categoryId);
    
    // 3. 남은 카테고리 ID 목록 가져오기 (삭제된 카테고리 제외)
    const remainingCategoryIds = categories
      .filter(cat => cat.id !== categoryId)
      .map(cat => cat.id);
    
    // 4. 매트릭스/카테고리 태그가 모두 붙어있지 않은 할 일 삭제
    const orphanedTodos = todos.filter(todo => {
      // 이미 삭제한 할 일은 제외
      if (todo.categoryId === categoryId) {
        return false;
      }
      
      // quadrant가 있고
      if (todo.quadrant) {
        // categoryId가 없거나
        if (!todo.categoryId) {
          return true; // 삭제 대상
        }
        // categoryId가 'uncategorized'가 아니고, 유효한 카테고리 ID도 아닌 경우
        if (todo.categoryId !== 'uncategorized' && !remainingCategoryIds.includes(todo.categoryId)) {
          return true; // 삭제 대상 (카테고리가 삭제되어 유효하지 않음)
        }
      }
      return false;
    });
    
    console.log(`  - 고아 할 일 ${orphanedTodos.length}개 삭제`);
    orphanedTodos.forEach(todo => {
      console.log(`    삭제: ${todo.text} (quadrant: ${todo.quadrant}, categoryId: ${todo.categoryId})`);
      deleteTodo(todo.id);
    });
  }, [todos, categories, deleteTodo, deleteCategoryOriginal]);
  const { categories: eventCategories, createCategory: createEventCategory, updateCategory: updateEventCategory, deleteCategory: deleteEventCategory } = useEventCategories();
  const { events, getEventsForDate, addEvent, updateEvent, deleteEvent, syncWithGoogle, isSyncing } = useEvents();
  const { moods, getMoodForDate, setMoodForDate } = useMoodTracker();
  const { setTab: setStickerTab, getStickers, currentTabId, addSticker, setStickers } = useStickerStore();
  const { routines, addRoutine, updateRoutine, deleteRoutine, reorderRoutines } = useRoutines();

  const [activeTab, setActiveTab] = useState<'event' | 'tasks' | 'daily-focus' | 'memo'>('tasks');
  const [tasksSubTab, setTasksSubTab] = useState<'quadrant' | 'category' | 'routine'>('quadrant');
  const [dailyFocusSubTab, setDailyFocusSubTab] = useState<'daily-focus' | 'diary'>('daily-focus');
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // 실제 내부 탭 ID 계산
  const getInternalTab = (): 'event' | 'quadrant' | 'category' | 'daily-focus' | 'memo' | 'routine' | 'diary' => {
    if (activeTab === 'tasks') {
      return tasksSubTab;
    } else if (activeTab === 'daily-focus') {
      return dailyFocusSubTab;
    }
    return activeTab;
  };
  
  const internalTab = getInternalTab();
  
  // 탭 이름 매핑: 내부 탭 ID -> 스토어 탭 ID
  const tabNameMap: Record<'event' | 'quadrant' | 'category' | 'daily-focus' | 'memo' | 'routine' | 'diary', string> = {
    'event': 'Calendar',
    'quadrant': 'Matrix',
    'category': 'Category',
    'daily-focus': 'Daily Focus',
    'diary': 'Diary',
    'memo': 'Memo',
    'routine': 'Routine',
  };
  
  // 탭 전환 시 스토어도 업데이트
  const handleTabChange = (tab: 'event' | 'tasks' | 'daily-focus' | 'memo') => {
    setActiveTab(tab);
    // 스토어의 탭 ID로 변환하여 저장
    const currentInternalTab = tab === 'tasks' ? tasksSubTab : (tab === 'daily-focus' ? dailyFocusSubTab : tab);
    if (currentInternalTab in tabNameMap) {
      const storeTabId = tabNameMap[currentInternalTab as keyof typeof tabNameMap];
      setStickerTab(storeTabId);
    }
  };
  
  // 서브탭 변경 핸들러
  const handleTasksSubTabChange = (subTab: 'quadrant' | 'category' | 'routine') => {
    setTasksSubTab(subTab);
    const storeTabId = tabNameMap[subTab];
    setStickerTab(storeTabId);
  };
  
  const handleDailyFocusSubTabChange = (subTab: 'daily-focus' | 'diary') => {
    setDailyFocusSubTab(subTab);
    const storeTabId = tabNameMap[subTab];
    setStickerTab(storeTabId);
  };

  const handleExport = async (type: 'daily-focus' | 'diary' | 'both', format: 'pdf' | 'png' = 'pdf') => {
    try {
      const elements: HTMLElement[] = [];
      const dateStr = selectedDate;
      
      if (type === 'daily-focus' || type === 'both') {
        // 시간 계획/기록 패널을 포함한 전체 레이아웃 찾기
        let dailyFocusLayout = document.querySelector('.app-layout.daily-focus-mode') as HTMLElement;
        
        // 레이아웃을 찾지 못한 경우, ID로 데일리 포커스 뷰 찾기
        if (!dailyFocusLayout) {
          const dailyFocusElement = document.querySelector('#daily-focus-view') as HTMLElement;
          
          if (dailyFocusElement) {
            // 부모 레이아웃 찾기
            dailyFocusLayout = dailyFocusElement.closest('.app-layout.daily-focus-mode') as HTMLElement;
          }
          
          // 여전히 찾지 못한 경우 클래스명으로 찾기 (fallback)
          if (!dailyFocusLayout) {
            dailyFocusLayout = document.querySelector('.daily-focus-tab')?.closest('.app-layout.daily-focus-mode') as HTMLElement;
          }
        }
        
        if (dailyFocusLayout) {
          // 중복 체크: 이미 추가된 요소가 아닌지 확인
          if (!elements.includes(dailyFocusLayout)) {
            elements.push(dailyFocusLayout);
          }
        } else {
          console.warn('Daily Focus 레이아웃을 찾을 수 없습니다.');
        }
      }
      
      if (type === 'diary' || type === 'both') {
        // ID로 정확하게 다이어리 뷰 찾기 (숨겨진 요소 포함)
        let diaryElement = document.querySelector('#diary-view') as HTMLElement;
        
        // ID를 찾지 못한 경우, 모든 #diary-view 요소 찾기 (visibility: hidden인 요소 포함)
        if (!diaryElement) {
          const allDiary = document.querySelectorAll('#diary-view');
          console.log('🔍 찾은 다이어리 요소 개수:', allDiary.length);
          if (allDiary.length > 0) {
            // 첫 번째 요소 사용 (보이는 요소 우선)
            for (let i = 0; i < allDiary.length; i++) {
              const el = allDiary[i] as HTMLElement;
              const style = window.getComputedStyle(el);
              console.log(`   요소 ${i + 1}: display=${style.display}, visibility=${style.visibility}, position=${style.position}`);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                diaryElement = el;
                console.log('✅ 보이는 다이어리 요소 선택');
                break;
              }
            }
            // 보이는 요소가 없으면 첫 번째 요소 사용 (숨겨진 요소라도)
            if (!diaryElement) {
              diaryElement = allDiary[0] as HTMLElement;
              console.log('⚠️ 보이는 요소 없음, 첫 번째 요소 사용 (숨겨진 요소일 수 있음)');
            }
          }
        }
        
        if (!diaryElement) {
          // 클래스명으로 찾기 (fallback)
          const diaryTabs = document.querySelectorAll('.diary-tab');
          console.log('🔍 .diary-tab 요소 개수:', diaryTabs.length);
          if (diaryTabs.length > 0) {
            // 보이는 요소 우선
            for (let i = 0; i < diaryTabs.length; i++) {
              const el = diaryTabs[i] as HTMLElement;
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                diaryElement = el;
                console.log('✅ 보이는 .diary-tab 요소 선택');
                break;
              }
            }
            // 보이는 요소가 없으면 첫 번째 요소 사용
            if (!diaryElement) {
              diaryElement = diaryTabs[0] as HTMLElement;
              console.log('⚠️ 보이는 요소 없음, 첫 번째 .diary-tab 사용');
            }
          }
        }
        
        if (diaryElement) {
          console.log('✅ 다이어리 요소 찾음:', diaryElement);
          console.log('   요소 크기:', diaryElement.offsetWidth, 'x', diaryElement.offsetHeight);
          console.log('   스크롤 크기:', diaryElement.scrollWidth, 'x', diaryElement.scrollHeight);
          // 중복 체크: 이미 추가된 요소가 아닌지 확인
          if (!elements.includes(diaryElement)) {
            elements.push(diaryElement);
          }
        } else {
          console.warn('❌ Diary 요소를 찾을 수 없습니다.');
          // diary 탭이 렌더링되지 않은 경우, 사용자에게 알림
          if (type === 'diary' || type === 'both') {
            setExportMessage('다이어리 탭을 찾을 수 없습니다. Daily Focus 탭에서 Diary 서브탭이 열려있는지 확인해주세요.');
            setExportMessageType('error');
            setShowExportMessage(true);
            return;
          }
        }
      }

      if (elements.length === 0) {
        setExportMessage('내보낼 콘텐츠를 찾을 수 없습니다.');
        setExportMessageType('error');
        setShowExportMessage(true);
        return;
      }

      if (format === 'png') {
        const filename = `todadot-${dateStr}${type === 'both' ? '-all' : type === 'daily-focus' ? '-focus' : '-diary'}.png`;
        await exportToPNG(elements, filename, {
          scale: 2,
          backgroundColor: '#ffffff',
        });
        setExportMessage('PNG 내보내기가 완료되었습니다.');
        setExportMessageType('success');
        setShowExportMessage(true);
      } else {
        const filename = `todadot-${dateStr}${type === 'both' ? '-all' : type === 'daily-focus' ? '-focus' : '-diary'}.pdf`;
        await exportToPDF(elements, filename);
        setExportMessage('PDF 내보내기가 완료되었습니다.');
        setExportMessageType('success');
        setShowExportMessage(true);
      }
    } catch (error) {
      console.error('내보내기 실패:', error);
      setExportMessage('PDF 내보내기에 실패했습니다. 콘솔을 확인해주세요.');
      setExportMessageType('error');
      setShowExportMessage(true);
    }
  };
  
  // 탭 변경 시마다 스토어 탭 ID 업데이트
  useEffect(() => {
    const storeTabId = tabNameMap[internalTab];
    setStickerTab(storeTabId);
  }, [internalTab, setStickerTab]);
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [moodTrackerMode, setMoodTrackerMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [showHeaderRemoveConfirm, setShowHeaderRemoveConfirm] = useState(false);
  const [showExportMessage, setShowExportMessage] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [exportMessageType, setExportMessageType] = useState<'success' | 'error'>('success');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Firebase 인증
  const { user, signOut: firebaseSignOut, isAuthenticated, uid } = useFirebaseAuth();
  const [showLocalDataImportDialog, setShowLocalDataImportDialog] = useState(false);
  const [isImportingData, setIsImportingData] = useState(false);
  
  // 스티커 편집 모드 관련 상태
  const [stickerEditMode, setStickerEditMode] = useState(false);
  const [showStylingManager, setShowStylingManager] = useState(false);
  // 🚨 로컬 스티커 state 제거: Zustand 스토어가 모든 탭의 스티커를 관리
  const [uploadedStickers, setUploadedStickers] = useState<Array<{ id: string; image: string; name: string }>>([]);
  const [timePlannerCollapsed, setTimePlannerCollapsed] = useState(false);
  const [timeRecordCollapsed, setTimeRecordCollapsed] = useState(false);
  const [monthlyGoalCollapsed, setMonthlyGoalCollapsed] = useState(false);

  const currentDateTodos = getTodosForDate(selectedDate);
  const isEventTabActive = activeTab === 'event';
  
  // 로컬 데이터 가져오기 확인 팝업 표시 여부 확인
  useEffect(() => {
    const environment = typeof window !== 'undefined' && (window as any).electronAPI && !(window as any).electronAPI.__isWebAdapter ? 'Electron' : 'Web';
    console.log('🔍 로컬 데이터 가져오기 확인:', {
      isAuthenticated,
      hasUser: !!user,
      userId: user?.uid,
      environment,
      timestamp: new Date().toISOString()
    });
    
    if (!isAuthenticated || !user) {
      console.log('❌ 인증되지 않음 - 팝업 표시 안 함');
      return;
    }
    
    // 로그인 직후 약간의 지연을 두어 상태가 안정화되도록 함
    const checkLocalData = () => {
      // 이미 마이그레이션 완료 확인
      const todosSyncCompleted = localStorage.getItem('firebase-todos-sync-completed');
      const diariesMemosSyncCompleted = localStorage.getItem('firebase-diaries-memos-sync-completed');
      
      console.log('📋 마이그레이션 상태 확인:', {
        todosSyncCompleted,
        diariesMemosSyncCompleted
      });
      
      if (todosSyncCompleted === 'true' && diariesMemosSyncCompleted === 'true') {
        console.log('✅ 이미 마이그레이션 완료 - 팝업 표시 안 함');
        return;
      }
      
      // 로컬 데이터 확인
      const hasLocalTodos = localStorage.getItem('eisenhower-todos');
      const hasLocalMemos = localStorage.getItem('memos');
      const hasLocalDiaries = localStorage.getItem('diaries');
      const hasLocalDiaryEntries = localStorage.getItem('diary-entries');
      
      console.log('📦 로컬 데이터 존재 여부:', {
        hasLocalTodos: !!hasLocalTodos,
        hasLocalMemos: !!hasLocalMemos,
        hasLocalDiaries: !!hasLocalDiaries,
        hasLocalDiaryEntries: !!hasLocalDiaryEntries
      });
      
      // 로컬 데이터가 하나라도 있으면 팝업 표시
      if (hasLocalTodos || hasLocalMemos || hasLocalDiaries || hasLocalDiaryEntries) {
        // 로컬 데이터 개수 확인
        let localDataCount = 0;
        try {
          if (hasLocalTodos) {
            const todos = JSON.parse(hasLocalTodos);
            if (Array.isArray(todos) && todos.length > 0) localDataCount += todos.length;
          }
          if (hasLocalMemos) {
            const memos = JSON.parse(hasLocalMemos);
            if (Array.isArray(memos) && memos.length > 0) localDataCount += memos.length;
          }
          if (hasLocalDiaries) {
            const diaries = JSON.parse(hasLocalDiaries);
            if (Array.isArray(diaries) && diaries.length > 0) localDataCount += diaries.length;
          }
          if (hasLocalDiaryEntries) {
            const entries = JSON.parse(hasLocalDiaryEntries);
            if (typeof entries === 'object' && Object.keys(entries).length > 0) {
              localDataCount += Object.keys(entries).length;
            }
          }
        } catch (e) {
          console.error('Failed to parse local data:', e);
        }
        
        console.log('📊 로컬 데이터 개수:', localDataCount);
        
        if (localDataCount > 0) {
          console.log('✅ 로컬 데이터 발견 - 팝업 표시:', {
            todos: hasLocalTodos ? JSON.parse(hasLocalTodos).length : 0,
            memos: hasLocalMemos ? JSON.parse(hasLocalMemos).length : 0,
            diaries: hasLocalDiaries ? JSON.parse(hasLocalDiaries).length : 0,
            diaryEntries: hasLocalDiaryEntries ? Object.keys(JSON.parse(hasLocalDiaryEntries)).length : 0,
            totalCount: localDataCount,
            environment
          });
          setShowLocalDataImportDialog(true);
        } else {
          console.log('⚠️ 로컬 데이터가 비어있거나 파싱 실패');
        }
      } else {
        console.log('📭 로컬 데이터 없음');
      }
    };
    
    // 로그인 직후 약간의 지연을 두어 상태가 안정화되도록 함
    const timeoutId = setTimeout(() => {
      checkLocalData();
    }, 500); // 500ms 지연
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, user]);
  
  // 로컬 데이터 가져오기 실행
  const handleImportLocalData = useCallback(async () => {
    setIsImportingData(true);
    try {
      // 투두 마이그레이션
      const todosSyncCompleted = localStorage.getItem('firebase-todos-sync-completed');
      if (todosSyncCompleted !== 'true') {
        const savedTodos = localStorage.getItem('eisenhower-todos');
        if (savedTodos) {
          try {
            const localTodos = JSON.parse(savedTodos);
            if (Array.isArray(localTodos) && localTodos.length > 0) {
              await todoService.saveTodosBatch(localTodos);
              console.log(`✅ Migrated ${localTodos.length} todos to Firebase`);
              localStorage.setItem('firebase-todos-sync-completed', 'true');
            }
          } catch (e) {
            console.error('Failed to migrate todos:', e);
          }
        } else {
          localStorage.setItem('firebase-todos-sync-completed', 'true');
        }
      }
      
      // 메모/일기 마이그레이션
      const diariesMemosSyncCompleted = localStorage.getItem('firebase-diaries-memos-sync-completed');
      if (diariesMemosSyncCompleted !== 'true') {
        const savedMemos = localStorage.getItem('memos');
        const savedDiaries = localStorage.getItem('diaries');
        
        let localMemos: any[] = [];
        let localDiaries: any[] = [];
        
        try {
          if (savedMemos) {
            localMemos = JSON.parse(savedMemos);
          }
          if (savedDiaries) {
            localDiaries = JSON.parse(savedDiaries);
          }
        } catch (e) {
          console.error('Failed to parse local memos/diaries:', e);
        }
        
        // Firestore에서 기존 데이터 불러오기
        const firestoreDiaries = await diaryService.getAllDiaries();
        const firestoreMemos = await diaryService.getAllMemos();
        
        const firestoreDiaryIds = new Set(firestoreDiaries.map(d => d.id));
        const firestoreMemoIds = new Set(firestoreMemos.map(m => m.id));
        
        const diariesToMigrate = localDiaries.filter((d: any) => d.id && !firestoreDiaryIds.has(d.id));
        const memosToMigrate = localMemos.filter((m: any) => m.id && !firestoreMemoIds.has(m.id));
        
        if (diariesToMigrate.length > 0) {
          await diaryService.saveDiariesBatch(diariesToMigrate);
          console.log(`✅ Migrated ${diariesToMigrate.length} diaries to Firebase`);
        }
        
        if (memosToMigrate.length > 0) {
          await diaryService.saveMemosBatch(memosToMigrate);
          console.log(`✅ Migrated ${memosToMigrate.length} memos to Firebase`);
        }
        
        localStorage.setItem('firebase-diaries-memos-sync-completed', 'true');
      }
      
      // 페이지 새로고침하여 데이터 다시 불러오기
      window.location.reload();
    } catch (error) {
      console.error('Failed to import local data:', error);
      alert('로컬 데이터 가져오기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsImportingData(false);
      setShowLocalDataImportDialog(false);
    }
  }, []);
  
  // 로컬 데이터 가져오기 건너뛰기
  const handleSkipLocalDataImport = useCallback(() => {
    // 마이그레이션 완료 플래그 설정 (건너뛰기)
    localStorage.setItem('firebase-todos-sync-completed', 'true');
    localStorage.setItem('firebase-diaries-memos-sync-completed', 'true');
    setShowLocalDataImportDialog(false);
  }, []);

  // 루틴을 할 일로 변환
  const convertRoutineToTodo = useCallback((routineId: string, date: DateString) => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    // 이미 해당 날짜에 루틴 할 일이 있는지 확인
    const existingTodo = todos.find(t => t.id === `routine-${routineId}-${date}`);
    if (existingTodo) {
      // 이미 있으면 토글
      toggleTodo(existingTodo.id);
      return;
    }

    // 새 할 일 생성
    const newTodo: TodoItem = {
      id: `routine-${routineId}-${date}`,
      text: routine.text,
      completed: false,
      createdAt: Date.now(),
      date: date,
    };

    addTodoWithId(newTodo);
  }, [routines, todos, toggleTodo, addTodoWithId]);

  // 선택된 날짜의 활성화된 루틴 ID 목록
  const activeRoutineIds = useMemo(() => {
    return todos
      .filter(t => t.date === selectedDate && t.id.startsWith('routine-'))
      .map(t => {
        const match = t.id.match(/^routine-(.+?)-(.+)$/);
        return match ? match[1] : null;
      })
      .filter((id): id is string => id !== null);
  }, [todos, selectedDate]);

  // 각 날짜별 활성화된 루틴 ID 목록을 반환하는 함수 (루틴 탭 달력용)
  const getActiveRoutineIdsForDate = useCallback((date: DateString): string[] => {
    return todos
      .filter(t => t.date === date && t.id.startsWith('routine-'))
      .map(t => {
        const match = t.id.match(/^routine-(.+?)-(.+)$/);
        return match ? match[1] : null;
      })
      .filter((id): id is string => id !== null)
      .filter(routineId => routines.some(r => r.id === routineId)); // 실제로 존재하는 루틴만
  }, [todos, routines]);

  // 루틴에서 생성된 할 일 목록
  const routineTodos = useMemo(() => {
    return todos.filter(t => t.date === selectedDate && t.id.startsWith('routine-'));
  }, [todos, selectedDate]);

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  // 헤더 이미지 불러오기
  useEffect(() => {
    const loadHeaderImage = async () => {
      if (window.electronAPI) {
        try {
          const imageData = await window.electronAPI.dbGetHeaderImage();
          if (imageData && imageData.image_path) {
            let imagePath = imageData.image_path;
            
            // 🚨 file:// 경로인 경우 base64로 변환
            if (imagePath.startsWith('file://') || /^[A-Za-z]:\\/.test(imagePath) || imagePath.startsWith('/')) {
              if (window.electronAPI.loadStickerImage) {
                try {
                  const result = await window.electronAPI.loadStickerImage(imagePath);
                  if (result && result.success && result.dataUrl) {
                    imagePath = result.dataUrl;
                  }
                } catch (error) {
                  console.error('Failed to load header image as data URL:', error);
                }
              }
            }
            
            setHeaderImage(imagePath);
          }
        } catch (error) {
          console.error('Failed to load header image:', error);
        }
      } else {
        const saved = localStorage.getItem('header-image');
        if (saved) {
          setHeaderImage(saved);
        }
      }
    };
    loadHeaderImage();
  }, []);

  const handleHeaderImageSave = async (imagePath: string) => {
    // 🚨 file:// 경로인 경우 base64로 변환하여 표시
    let displayPath = imagePath;
    
    if (imagePath.startsWith('file://') || /^[A-Za-z]:\\/.test(imagePath) || imagePath.startsWith('/')) {
      if (window.electronAPI && window.electronAPI.loadStickerImage) {
        try {
          const result = await window.electronAPI.loadStickerImage(imagePath);
          if (result && result.success && result.dataUrl) {
            displayPath = result.dataUrl;
          }
        } catch (error) {
          console.error('Failed to load header image as data URL:', error);
        }
      }
    }
    
    setHeaderImage(displayPath);
  };

  const handleHeaderImageRemove = () => {
    setShowHeaderRemoveConfirm(true);
  };

  const confirmHeaderImageRemove = async () => {
    setShowHeaderRemoveConfirm(false);
    
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.dbDeleteHeaderImage();
        if (result && result.success) {
          setHeaderImage(null);
        } else {
          alert('헤더 이미지 제거에 실패했습니다.');
          console.error('Failed to remove header image:', result?.error);
        }
      } catch (error) {
        console.error('Failed to remove header image:', error);
        alert('헤더 이미지 제거에 실패했습니다.');
      }
    } else {
      localStorage.removeItem('header-image');
      setHeaderImage(null);
    }
  };

  // 스티커 레이아웃 저장
  const handleSaveLayout = async (layout: StickerLayout) => {
    try {
      // 🚨 현재 탭의 스티커만 가져오기 (탭별 분리)
      const storeTabId = tabNameMap[internalTab];
      const currentTabStickers = getStickers(storeTabId);
      
      // 🚨 저장 데이터 클린업: 저장할 필요 없는 속성 제거 및 데이터 검증
      const cleanedStickers = currentTabStickers.map(s => {
        // 저장에 필요한 속성만 포함
        const cleaned: Sticker = {
          id: s.id,
          imagePath: s.imagePath, // base64일 경우 매우 길 수 있지만 저장 필요
          positionX: s.positionX,
          positionY: s.positionY,
          width: s.width,
          height: s.height,
          rotation: s.rotation || 0,
          zIndex: s.zIndex,
          // 선택적 속성들 (필요한 경우만)
          ...(s.xPercent !== undefined && { xPercent: s.xPercent }),
          ...(s.yPercent !== undefined && { yPercent: s.yPercent }),
          ...(s.widthPercent !== undefined && { widthPercent: s.widthPercent }),
          ...(s.heightPercent !== undefined && { heightPercent: s.heightPercent }),
          ...(s.date && { date: s.date }),
          ...(s.dayOffsetX !== undefined && { dayOffsetX: s.dayOffsetX }),
          ...(s.dayOffsetY !== undefined && { dayOffsetY: s.dayOffsetY }),
        };
        return cleaned;
      });
      
      const layoutToSave: StickerLayout = {
        ...layout,
        stickers: cleanedStickers, // 클린업된 현재 탭 스티커 사용
      };
      
      // 🚨 JSON 직렬화 (경고 코드 제거 - 파일 저장 방식으로 해결됨)
      const stickersData = JSON.stringify(layoutToSave.stickers);
      
      const savedAt = layoutToSave.savedAt.getTime();
      
      if (window.electronAPI && window.electronAPI.dbSaveStickerLayout) {
        const result = await window.electronAPI.dbSaveStickerLayout(
          layoutToSave.id,
          layoutToSave.name,
          layoutToSave.resolution.width,
          layoutToSave.resolution.height,
          stickersData,
          savedAt
        );
        if (result && result.success) {
          // alert 제거 - FloatingToolbar에서 모달로 처리
          // 저장 후에도 스티커 상태 유지 (초기화하지 않음)
        } else {
          const errorMsg = result?.error || 'Unknown error';
          console.error('❌ Layout save failed:', errorMsg);
          alert(`레이아웃 저장에 실패했습니다: ${errorMsg}`);
        }
      } else {
        // 로컬 스토리지에 저장
        const savedLayouts = localStorage.getItem('sticker-layouts');
        const layouts = savedLayouts ? JSON.parse(savedLayouts) : [];
        layouts.push(layoutToSave);
        localStorage.setItem('sticker-layouts', JSON.stringify(layouts));
        // alert 제거 - FloatingToolbar에서 모달로 처리
        // 저장 후에도 스티커 상태 유지 (초기화하지 않음)
      }
    } catch (error) {
      console.error('❌ Failed to save layout:', error);
      console.error('Error details:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('📍 Location: src/App.tsx handleSaveLayout function');
      const storeTabId = tabNameMap[internalTab];
      const currentTabStickers = getStickers(storeTabId);
      console.error('Stickers count:', currentTabStickers?.length || 0);
      const cleanedStickers = currentTabStickers.map(s => ({
        id: s.id,
        imagePath: s.imagePath,
        positionX: s.positionX,
        positionY: s.positionY,
        width: s.width,
        height: s.height,
        rotation: s.rotation || 0,
        zIndex: s.zIndex,
      }));
      console.error('Cleaned stickers sample:', cleanedStickers?.slice(0, 1) || 'none');
      alert(`레이아웃 저장에 실패했습니다: ${errorMessage}`);
    }
  };

  // 레이아웃 적용
  const handleApplyLayout = async (layout: StickerLayout) => {
    // 🚨 현재 탭 ID 가져오기
    const storeTabId = tabNameMap[internalTab];
    
    // 🚨 Zustand 스토어에 직접 적용 (탭별 분리)
    setStickers(storeTabId, layout.stickers);
    
    // 필요하다면 Electron 창 크기 조절 로직 추가
    if (window.electronAPI && (window.electronAPI as any).resizeWindow) {
      try {
        await (window.electronAPI as any).resizeWindow(layout.resolution.width, layout.resolution.height);
      } catch (error) {
        console.error('Failed to resize window:', error);
        alert('창 크기 변경에 실패했습니다.');
      }
    }
  };

  // 레이아웃 삭제
  const handleDeleteLayout = async (layoutId: string) => {
    // StylingManager에서 이미 삭제 처리를 하므로 여기서는 추가 작업 없음
  };

  // 스티커 추가 핸들러 (파일 업로드)
  const handleAddSticker = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const newSticker = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        image: result,
        name: file.name,
      };
      setUploadedStickers((prev) => [...prev, newSticker]);
    };
    reader.readAsDataURL(file);
  };

  // 업로드된 스티커를 캔버스에 추가
  // 스티커 추가 중복 방지 플래그
  const addingStickerRef = useRef(false);

  const handleAddStickerToCanvas = async (imageUrl: string, name: string) => {
    // 이미 추가 중이면 무시
    if (addingStickerRef.current) {
      console.warn('Sticker is already being added, ignoring duplicate call');
      return;
    }
    
    try {
      addingStickerRef.current = true;
      const img = new Image();
      img.onload = async () => {
        const width = Math.min(img.width, 80);
        const height = (img.height / img.width) * width;
        
        // 캘린더 컨테이너를 찾아서 중앙에 배치
        const calendarContainer = document.querySelector('.calendar.expanded');
        let positionX = 200;
        let positionY = 200;
        let date: string | undefined;
        let dayOffsetX: number | undefined;
        let dayOffsetY: number | undefined;
        
        if (calendarContainer) {
          const containerRect = calendarContainer.getBoundingClientRect();
          // 컨테이너 중앙 계산
          positionX = (containerRect.width / 2) - (width / 2);
          positionY = (containerRect.height / 2) - (height / 2);
          
          // 가장 가까운 날짜 셀 찾기
          const dayElements = document.querySelectorAll('.calendar-day:not(.empty)');
          let closestDay: Element | null = null;
          let minDistance = Infinity;
          
          dayElements.forEach((dayEl) => {
            const dayRect = dayEl.getBoundingClientRect();
            const dayCenterX = dayRect.left + dayRect.width / 2;
            const dayCenterY = dayRect.top + dayRect.height / 2;
            const stickerCenterX = containerRect.left + positionX + width / 2;
            const stickerCenterY = containerRect.top + positionY + height / 2;
            const distance = Math.sqrt(
              Math.pow(dayCenterX - stickerCenterX, 2) + Math.pow(dayCenterY - stickerCenterY, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              closestDay = dayEl;
            }
          });
          
          if (closestDay) {
            const dayDate = closestDay.getAttribute('data-date');
            if (dayDate) {
              date = dayDate;
              const dayRect = closestDay.getBoundingClientRect();
              dayOffsetX = positionX - (dayRect.left - containerRect.left);
              dayOffsetY = positionY - (dayRect.top - containerRect.top);
            }
          }
          
          // 컨테이너 내부로 제한 (배너 위까지 허용)
          positionX = Math.max(-50, Math.min(positionX, containerRect.width - width + 50));
          positionY = Math.max(-254, Math.min(positionY, containerRect.height - height + 50));
        }
        
        // 🚨 이미지를 파일로 저장 (Base64 → 파일 시스템)
        let savedImagePath = imageUrl; // 기본값: 파일 저장 실패 시 원본 URL 사용
        
        if (window.electronAPI && window.electronAPI.saveStickerImage) {
          // Base64 데이터인 경우 파일로 저장
          if (imageUrl.startsWith('data:image/')) {
            try {
              const saveResult = await window.electronAPI.saveStickerImage(imageUrl);
              if (saveResult && saveResult.success && saveResult.filePath) {
                savedImagePath = saveResult.filePath;
              } else {
                console.warn('Failed to save image as file, using base64:', saveResult?.error);
                // Base64 그대로 사용 (하위 호환성)
              }
            } catch (error) {
              console.error('Error saving image as file:', error);
              // Base64 그대로 사용
            }
          }
        }
        
        if (window.electronAPI && window.electronAPI.dbSaveSticker) {
          const today = new Date();
          const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          const result = await window.electronAPI.dbSaveSticker(
            date,
            savedImagePath, // 파일 경로 사용
            positionX,
            positionY,
            width,
            height,
            false
          );
          
          if (result && result.success) {
            // 현재 탭의 스티커를 가져와서 zIndex 계산
            const storeTabId = tabNameMap[internalTab];
            const currentTabStickers = getStickers(storeTabId);
            const maxZIndex = Math.max(...currentTabStickers.map(s => s.zIndex || 10001), 10001);
            const newSticker: Sticker = {
              id: result.id,
              imagePath: savedImagePath, // 파일 경로 사용
              positionX,
              positionY,
              width,
              height,
              date,
              dayOffsetX,
              dayOffsetY,
              zIndex: maxZIndex + 1,
              rotation: 0,
            };
            // 🚨 탭별 분리 강화: 현재 탭 ID 확인 후 추가
            const currentStoreTabId = tabNameMap[internalTab];
            // currentTabId가 올바르게 설정되어 있는지 확인
            if (currentTabId !== currentStoreTabId) {
              console.warn(`Tab mismatch! currentTabId: ${currentTabId}, expected: ${currentStoreTabId}. Fixing...`);
              setStickerTab(currentStoreTabId);
            }
            addSticker(newSticker);
            addingStickerRef.current = false; // 추가 완료 후 플래그 해제
          } else {
            console.error('Failed to save sticker - result:', result);
            alert('스티커 저장에 실패했습니다.');
            addingStickerRef.current = false; // 실패 시에도 플래그 해제
          }
        } else {
          // 🚨 이미지를 파일로 저장 (Base64 → 파일 시스템)
          let savedImagePath = imageUrl; // 기본값: 파일 저장 실패 시 원본 URL 사용
          
          if (window.electronAPI && window.electronAPI.saveStickerImage) {
            // Base64 데이터인 경우 파일로 저장
            if (imageUrl.startsWith('data:image/')) {
              try {
                const saveResult = await window.electronAPI.saveStickerImage(imageUrl);
                if (saveResult && saveResult.success && saveResult.filePath) {
                  savedImagePath = saveResult.filePath;
                } else {
                  console.warn('Failed to save image as file, using base64:', saveResult?.error);
                }
              } catch (error) {
                console.error('Error saving image as file:', error);
              }
            }
          }
          
          // 현재 탭의 스티커를 가져와서 zIndex 계산
          const storeTabId = tabNameMap[internalTab];
          const currentTabStickers = getStickers(storeTabId);
          const maxZIndex = Math.max(...currentTabStickers.map(s => s.zIndex || 10001), 10001);
          const newSticker: Sticker = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            imagePath: savedImagePath, // 파일 경로 사용
            positionX,
            positionY,
            width,
            height,
            date,
            dayOffsetX,
            dayOffsetY,
            zIndex: maxZIndex + 1,
            rotation: 0,
          };
          // 🚨 탭별 분리 강화: 현재 탭 ID 확인 후 추가
          const currentStoreTabId = tabNameMap[internalTab];
          // currentTabId가 올바르게 설정되어 있는지 확인
          if (currentTabId !== currentStoreTabId) {
            console.warn(`Tab mismatch! currentTabId: ${currentTabId}, expected: ${currentStoreTabId}. Fixing...`);
            setStickerTab(currentStoreTabId);
          }
          addSticker(newSticker);
          
          // 🚨 로컬 스토리지 제거: Zustand 스토어가 이미 관리하므로 중복 저장 불필요
          
          addingStickerRef.current = false; // 추가 완료 후 플래그 해제
        }
      };
      img.onerror = (error) => {
        console.error('Image load error:', error);
        alert('이미지 로드에 실패했습니다.');
        addingStickerRef.current = false; // 에러 시에도 플래그 해제
      };
      img.src = imageUrl;
    } catch (error) {
      console.error('Failed to add sticker to canvas:', error);
      alert('스티커 추가에 실패했습니다.');
      addingStickerRef.current = false; // 에러 시에도 플래그 해제
    }
  };

  // 업로드된 스티커 제거
  const handleRemoveUploadedSticker = (id: string) => {
    setUploadedStickers((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="app">
      {/* 고정된 네비게이션 메뉴 */}
      <header className="fixed-header">
        <nav className="app-nav">
          <button
            className={`nav-btn ${activeTab === 'event' ? 'active' : ''}`}
            onClick={() => handleTabChange('event')}
          >
            Calendar
          </button>
          <button
            className={`nav-btn ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => handleTabChange('tasks')}
          >
            Tasks
          </button>
          <button
            className={`nav-btn ${activeTab === 'daily-focus' ? 'active' : ''}`}
            onClick={() => handleTabChange('daily-focus')}
          >
            Daily Focus
          </button>
          <button
            className={`nav-btn ${activeTab === 'memo' ? 'active' : ''}`}
            onClick={() => handleTabChange('memo')}
          >
            Memo
          </button>
          <div className="help-icon-wrapper" style={{ marginLeft: 'auto', marginRight: '12px' }}>
            <HelpCircle 
              size={18} 
              color="var(--text-primary)" 
              className="help-icon"
            />
            <div className="tooltip">
              드래그 앤 드롭 팁: 할 일의 순서를 바꾸거나 다른 매트릭스/카테고리로 옮길 수 있습니다. 옮기려는 영역의 라벨 위나 해당 영역의 최하단 빈 공간에 드롭해 주세요. 이미 존재하는 할 일 리스트 사이에 드롭하지 않도록 주의해 주세요.
            </div>
          </div>
          <button
            className="settings-btn"
            onClick={() => setShowStylingManager(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              marginRight: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="스타일 관리"
          >
            <Sparkles size={18} color="var(--text-primary)" />
          </button>
          {/* 설정 아이콘 숨김 처리 (캘린더 연동 기능 보류) */}
          {/* 나중에 다시 활성화하려면 아래 주석을 해제하세요 */}
          {false && (
            <button
              className="settings-btn"
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="설정"
            >
              <Settings size={18} color="var(--text-primary)" />
            </button>
          )}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <NicknameEditor />
              <button
                className="settings-btn"
                onClick={() => {
                  setShowLogoutConfirm(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="로그아웃"
              >
                <LogOut size={18} color="var(--text-primary)" />
              </button>
            </div>
          ) : (
            <button
              className="settings-btn"
              onClick={() => setShowLoginModal(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="로그인"
            >
              <LogIn size={18} color="var(--text-primary)" />
            </button>
          )}
        </nav>
      </header>

      {/* 배너 영역 - 헤더 이미지가 있을 때만 표시 */}
      {headerImage && (
        <div className="banner-container">
          <img src={headerImage} alt="Banner" className="banner-image" />
          <button
            className="header-remove-btn"
            onClick={handleHeaderImageRemove}
            title="헤더 이미지 제거"
          >
            ✕
          </button>
        </div>
      )}

      <div className={`app-layout ${activeTab === 'daily-focus' ? 'daily-focus-mode' : ''}`}>
        {/* 내보내기를 위해 항상 Daily Focus 탭을 DOM에 렌더링 (숨김) */}
        {activeTab !== 'daily-focus' || dailyFocusSubTab !== 'daily-focus' ? (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}>
            <div className="app-layout daily-focus-mode">
              <main className="main-content">
                <div className="content-area">
                  <DailyFocusTab
                    todos={todos}
                    categories={categories}
                    selectedDate={selectedDate}
                    onToggleTodo={toggleTodo}
                    onReorderFocusTodos={reorderFocusTodos}
                    onResetTodayFocus={resetTodayFocus}
                    onOrganizeFocusTodos={organizeFocusTodos}
                    onToggleTodayFocus={toggleTodayFocus}
                  />
                </div>
              </main>
              <aside className="left-sidebar">
                <TimePlannerPanel 
                  selectedDate={selectedDate}
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                />
              </aside>
              <aside className="left-sidebar left-sidebar-second">
                <TimeRecordPanel 
                  selectedDate={selectedDate}
                  isCollapsed={false}
                  onToggleCollapse={() => {}}
                />
              </aside>
            </div>
          </div>
        ) : null}
        
        {/* 내보내기를 위해 항상 Diary 탭을 DOM에 렌더링 (숨김) */}
        {activeTab !== 'daily-focus' || dailyFocusSubTab !== 'diary' ? (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none' }}>
            <DiaryTab
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              datesWithDiaries={getDatesWithDiaries()}
              datesWithMemos={getDatesWithMemos()}
              moods={moods}
              onMoodSelect={setMoodForDate}
            />
          </div>
        ) : null}
        
        {activeTab === 'daily-focus' && dailyFocusSubTab === 'daily-focus' ? (
          <>
            {/* 왼쪽: 데일리 포커스 목록 */}
            <main className="main-content">
              <div className="subtab-selector" style={{ 
                display: 'flex', 
                gap: '8px', 
                padding: '12px 20px', 
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <button
                  className={`subtab-btn ${dailyFocusSubTab === 'daily-focus' ? 'active' : ''}`}
                  onClick={() => handleDailyFocusSubTabChange('daily-focus')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: dailyFocusSubTab === 'daily-focus' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: dailyFocusSubTab === 'daily-focus' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: dailyFocusSubTab === 'daily-focus' ? '600' : '400',
                  }}
                  title="Focus"
                >
                  <Spotlight size={16} />
                  <span>Focus</span>
                </button>
                <button
                  className={`subtab-btn ${dailyFocusSubTab === 'diary' ? 'active' : ''}`}
                  onClick={() => handleDailyFocusSubTabChange('diary')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: dailyFocusSubTab === 'diary' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: dailyFocusSubTab === 'diary' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: dailyFocusSubTab === 'diary' ? '600' : '400',
                  }}
                  title="Diary"
                >
                  <NotebookPen size={16} />
                  <span>Diary</span>
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  title="내보내기"
                >
                  <FileUp size={16} />
                  <span>Export</span>
                </button>
              </div>
              <div className="content-area">
                <DailyFocusTab
                  todos={todos}
                  categories={categories}
                  selectedDate={selectedDate}
                  onToggleTodo={toggleTodo}
                  onReorderFocusTodos={reorderFocusTodos}
                  onResetTodayFocus={resetTodayFocus}
                  onOrganizeFocusTodos={organizeFocusTodos}
                  onToggleTodayFocus={toggleTodayFocus}
                />
              </div>
            </main>
            {/* 오른쪽: 시간 계획 및 기록 사이드바 */}
            <aside className={`left-sidebar ${timePlannerCollapsed ? 'collapsed' : ''}`}>
              <TimePlannerPanel 
                selectedDate={selectedDate}
                isCollapsed={timePlannerCollapsed}
                onToggleCollapse={() => setTimePlannerCollapsed(!timePlannerCollapsed)}
              />
            </aside>
            <aside className={`left-sidebar left-sidebar-second ${timeRecordCollapsed ? 'collapsed' : ''}`}>
              <TimeRecordPanel 
                selectedDate={selectedDate}
                isCollapsed={timeRecordCollapsed}
                onToggleCollapse={() => setTimeRecordCollapsed(!timeRecordCollapsed)}
              />
            </aside>
          </>
        ) : activeTab === 'daily-focus' && dailyFocusSubTab === 'diary' ? (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="subtab-selector" style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '12px 20px', 
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)'
            }}>
              <button
                className={`subtab-btn ${dailyFocusSubTab === 'daily-focus' ? 'active' : ''}`}
                onClick={() => handleDailyFocusSubTabChange('daily-focus')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: dailyFocusSubTab === 'daily-focus' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: dailyFocusSubTab === 'daily-focus' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: dailyFocusSubTab === 'daily-focus' ? '600' : '400',
                }}
                title="Focus"
              >
                <Spotlight size={16} />
                <span>Focus</span>
              </button>
              <button
                className={`subtab-btn ${dailyFocusSubTab === 'diary' ? 'active' : ''}`}
                onClick={() => handleDailyFocusSubTabChange('diary')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: dailyFocusSubTab === 'diary' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                  color: dailyFocusSubTab === 'diary' ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: dailyFocusSubTab === 'diary' ? '600' : '400',
                }}
                title="Diary"
              >
                <NotebookPen size={16} />
                <span>Diary</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
                title="내보내기"
              >
                <FileUp size={16} />
                <span>Export</span>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DiaryTab
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              datesWithDiaries={getDatesWithDiaryContent()}
              datesWithMemos={getDatesWithMemos()}
              moods={moods}
              onMoodSelect={setMoodForDate}
            />
            </div>
          </div>
        ) : null}

        {/* 사이드바: Tasks, Event, Memo 탭용 */}
        {(activeTab === 'tasks' || activeTab === 'event' || activeTab === 'memo') && (
          <>
            {/* 왼쪽: 캘린더 또는 일정 추가 */}
            <aside className={`left-sidebar ${isEventTabActive ? 'event-mode' : ''}`}>
              {!isEventTabActive ? (
                <Calendar
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  events={isEventTabActive ? events : []}
                  isExpanded={false}
                  showMoodTracker={internalTab !== 'memo'}
                  onMoodSelect={setMoodForDate}
                  moodEntries={moods}
                  onMoodTrackerModeChange={setMoodTrackerMode}
                  categories={eventCategories}
                  onCreateCategory={createEventCategory}
                  onUpdateCategory={updateEventCategory}
                  onDeleteCategory={deleteEventCategory}
                  datesWithMemos={internalTab === 'memo' ? getDatesWithMemos() : []}
                  datesWithDiaries={internalTab === 'diary' ? getDatesWithDiaryContent() : []}
                  onDayOfWeekSelect={setSelectedDayOfWeek}
                  selectedDayOfWeek={selectedDayOfWeek}
                  activeTab={internalTab}
                  todos={todos}
                  routines={internalTab === 'routine' ? routines : undefined}
                  activeRoutineIdsByDate={internalTab === 'routine' ? getActiveRoutineIdsForDate : undefined}
                />
              ) : (
                <>
                  <MonthlyGoalPanel
                    selectedDate={selectedDate}
                    isCollapsed={monthlyGoalCollapsed}
                    onToggleCollapse={() => setMonthlyGoalCollapsed(!monthlyGoalCollapsed)}
                  />
                  <EventTab
                    events={events}
                    selectedDate={selectedDate}
                    onAddEvent={addEvent}
                    onUpdateEvent={updateEvent}
                    onDeleteEvent={deleteEvent}
                    selectedEvent={selectedEvent}
                    onEventSelect={setSelectedEvent}
                    categories={eventCategories}
                    onCreateCategory={createEventCategory}
                    onUpdateCategory={updateEventCategory}
                    onDeleteCategory={deleteEventCategory}
                  />
                </>
              )}
            </aside>
          </>
        )}

        {/* Tasks 탭과 다른 탭의 메인 컨텐츠 */}
        {(activeTab === 'tasks' || activeTab === 'event' || activeTab === 'memo') && (
          <main className={`main-content ${isEventTabActive ? 'event-mode' : ''} ${moodTrackerMode ? 'mood-tracker-active' : ''}`}>
            {/* 서브탭 선택 버튼 */}
            {activeTab === 'tasks' && (
              <div className="subtab-selector" style={{ 
                display: 'flex', 
                gap: '8px', 
                padding: '12px 20px', 
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <button
                  className={`subtab-btn ${tasksSubTab === 'quadrant' ? 'active' : ''}`}
                  onClick={() => handleTasksSubTabChange('quadrant')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: tasksSubTab === 'quadrant' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: tasksSubTab === 'quadrant' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: tasksSubTab === 'quadrant' ? '600' : '400',
                  }}
                  title="Eisenhower Matrix"
                >
                  <Grid2x2 size={16} />
                  <span>Matrix</span>
                </button>
                <button
                  className={`subtab-btn ${tasksSubTab === 'category' ? 'active' : ''}`}
                  onClick={() => handleTasksSubTabChange('category')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: tasksSubTab === 'category' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: tasksSubTab === 'category' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: tasksSubTab === 'category' ? '600' : '400',
                  }}
                  title="Category"
                >
                  <LayoutList size={16} />
                  <span>Category</span>
                </button>
                <button
                  className={`subtab-btn ${tasksSubTab === 'routine' ? 'active' : ''}`}
                  onClick={() => handleTasksSubTabChange('routine')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: tasksSubTab === 'routine' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: tasksSubTab === 'routine' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: tasksSubTab === 'routine' ? '600' : '400',
                  }}
                  title="Routine"
                >
                  <Reply size={16} />
                  <span>Routine</span>
                </button>
              </div>
            )}
            
            {false && (
              <div className="subtab-selector" style={{ 
                display: 'flex', 
                gap: '8px', 
                padding: '12px 20px', 
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)'
              }}>
                <button
                  className={`subtab-btn ${dailyFocusSubTab === 'daily-focus' ? 'active' : ''}`}
                  onClick={() => handleDailyFocusSubTabChange('daily-focus')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: dailyFocusSubTab === 'daily-focus' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: dailyFocusSubTab === 'daily-focus' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: dailyFocusSubTab === 'daily-focus' ? '600' : '400',
                  }}
                  title="Focus"
                >
                  <Spotlight size={16} />
                  <span>Focus</span>
                </button>
                <button
                  className={`subtab-btn ${dailyFocusSubTab === 'diary' ? 'active' : ''}`}
                  onClick={() => handleDailyFocusSubTabChange('diary')}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    background: dailyFocusSubTab === 'diary' ? 'var(--accent-color)' : 'var(--bg-secondary)',
                    color: dailyFocusSubTab === 'diary' ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    fontWeight: dailyFocusSubTab === 'diary' ? '600' : '400',
                  }}
                  title="Diary"
                >
                  <NotebookPen size={16} />
                  <span>Diary</span>
                </button>
              </div>
            )}
            
            <div className={`content-area ${moodTrackerMode ? 'mood-tracker-active' : ''}`}>
            {isEventTabActive && (
              <>
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <Calendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    events={events}
                    isExpanded={true}
                    onEventClick={handleEventClick}
                    onUpdateEvent={updateEvent}
                    showMoodTracker={false}
                    categories={eventCategories}
                    todos={todos}
                  />
                  {/* CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리 */}
                </div>
              </>
            )}

            {(activeTab === 'tasks' && tasksSubTab === 'quadrant') && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <QuadrantTab
                  todos={currentDateTodos}
                  allTodos={todos}
                  selectedDate={selectedDate}
                  onAddTodo={addTodoByQuadrant}
                  onToggleTodo={toggleTodo}
                  onDeleteTodo={deleteTodo}
                  onMoveTodo={moveTodoToQuadrant}
                  onReorderTodo={reorderTodoInQuadrant}
                  onOrganizeTodosInQuadrant={organizeTodosInQuadrant}
                  onOpenBottomSheet={() => setShowBottomSheet(true)}
                  onEditTodo={editTodoText}
                  onChangeDate={changeTodoDate}
                  onUpdateMemo={updateTodoMemo}
                  onDeleteMemo={deleteTodoMemo}
                  onSetTime={setTodoTime}
                  onDeleteTime={deleteTodoTime}
                  getTodayDateString={getTodayDateString}
                  moveIncompleteTodosToTomorrow={moveIncompleteTodosToTomorrow}
                  moveIncompleteTodosToToday={moveIncompleteTodosToToday}
                  moveIncompleteTodosToDate={moveIncompleteTodosToDate}
              deleteIncompleteTodos={deleteIncompleteTodos}
              deleteAllTodos={deleteAllTodos}
              onToggleTodayFocus={toggleTodayFocus}
              duplicateTodoToday={duplicateTodoToday}
              duplicateTodoToDate={duplicateTodoToDate}
            />
                {/* CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리 */}
              </div>
            )}

            {(activeTab === 'tasks' && tasksSubTab === 'category') && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <CategoryTab
                  todos={currentDateTodos}
                  allTodos={todos}
                  categories={categories}
                  selectedDate={selectedDate}
                  onAddTodo={addTodoByCategory}
                  onToggleTodo={toggleTodo}
                  onDeleteTodo={deleteTodo}
                  onMoveTodo={moveTodoToCategory}
                  onReorderTodo={reorderTodoInCategory}
                  onOrganizeTodosInCategory={organizeTodosInCategory}
                  onCreateCategory={createCategory}
                  onUpdateCategory={updateCategory}
                  onDeleteCategory={deleteCategory}
                  onReorderCategories={reorderCategories}
                  onOpenBottomSheet={() => setShowBottomSheet(true)}
                  onEditTodo={editTodoText}
                  onChangeDate={changeTodoDate}
                  onUpdateMemo={updateTodoMemo}
                  onDeleteMemo={deleteTodoMemo}
                  onSetTime={setTodoTime}
                  onDeleteTime={deleteTodoTime}
                  getTodayDateString={getTodayDateString}
                  moveIncompleteTodosToTomorrow={moveIncompleteTodosToTomorrow}
                  moveIncompleteTodosToToday={moveIncompleteTodosToToday}
                  moveIncompleteTodosToDate={moveIncompleteTodosToDate}
              deleteIncompleteTodos={deleteIncompleteTodos}
              deleteAllTodos={deleteAllTodos}
              onToggleTodayFocus={toggleTodayFocus}
              duplicateTodoToday={duplicateTodoToday}
              duplicateTodoToDate={duplicateTodoToDate}
            />
                {/* CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리 */}
              </div>
            )}


            {internalTab === 'memo' && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <MemoTab
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  moods={moods}
                  onMoodSelect={setMoodForDate}
                  datesWithDiaries={getDatesWithDiaries()}
                  onDayOfWeekSelect={setSelectedDayOfWeek}
                  selectedDayOfWeek={selectedDayOfWeek}
                />
                {/* CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리 */}
              </div>
            )}

            {(activeTab === 'tasks' && tasksSubTab === 'routine') && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <RoutineTab
                  routines={routines}
                  selectedDate={selectedDate}
                  onAddRoutine={addRoutine}
                  onUpdateRoutine={updateRoutine}
                  onDeleteRoutine={deleteRoutine}
                  onReorderRoutines={reorderRoutines}
                  onConvertRoutineToTodo={convertRoutineToTodo}
                  activeRoutineIds={activeRoutineIds}
                  todos={routineTodos}
                  onToggleTodo={toggleTodo}
                  onDeleteTodo={deleteTodo}
                />
              </div>
            )}
            </div>
          </main>
        )}
      </div>

      {/* 전역 스티커 오버레이 */}
      <StickerOverlayComponent 
        isEditMode={stickerEditMode}
        onDeleteSticker={() => {
          // 스토어에서 삭제는 이미 StickerOverlayComponent에서 처리됨
          // 필요시 추가 로직 (DB 삭제 등)
        }}
      />

      {/* 내보내기 미리보기 모달 */}
      <ExportPreviewModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* PDF 내보내기 결과 메시지 */}
      {showExportMessage && (
        <ConfirmDialog
          message={exportMessage}
          confirmText="확인"
          cancelText=""
          variant={exportMessageType}
          onConfirm={() => setShowExportMessage(false)}
          onCancel={() => setShowExportMessage(false)}
        />
      )}

      {/* 헤더 이미지 제거 확인 다이얼로그 */}
      {showHeaderRemoveConfirm && (
        <ConfirmDialog
          message="헤더 이미지를 제거할까요?"
          confirmText="제거"
          cancelText="취소"
          variant="default"
          onConfirm={confirmHeaderImageRemove}
          onCancel={() => setShowHeaderRemoveConfirm(false)}
        />
      )}

      {/* 바텀시트 */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        onCreateTodo={addTodoFromBottomSheet}
        categories={categories}
      />

      {/* 설정 모달 숨김 처리 (캘린더 연동 기능 보류) */}
      {/* 나중에 다시 활성화하려면 아래 주석을 해제하세요 */}
      {false && showSettings && (
        <GoogleApiSettings onClose={() => setShowSettings(false)} />
      )}

      {showHeaderEditor && (
        <HeaderImageEditor
          onClose={() => setShowHeaderEditor(false)}
          onSave={handleHeaderImageSave}
        />
      )}

      {/* 로그인 모달 */}
      {showLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* 로그아웃 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="로그아웃"
        message="로그아웃 할까요?"
        confirmText="로그아웃"
        cancelText="취소"
        onConfirm={async () => {
          await firebaseSignOut();
          setShowLogoutConfirm(false);
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      
      {/* 로컬 데이터 가져오기 확인 팝업 */}
      <ConfirmDialog
        isOpen={showLocalDataImportDialog}
        title="로컬 데이터 가져오기"
        message="기존에 로컬에 저장된 데이터를 로그인한 계정으로 가져오시겠습니까?"
        confirmText={isImportingData ? "가져오는 중..." : "가져오기"}
        cancelText="건너뛰기"
        onConfirm={handleImportLocalData}
        onCancel={handleSkipLocalDataImport}
        variant="default"
      />

      {/* 동기화 확인 모달 */}
      {showSyncConfirm && (
        <div className="modal-overlay" onClick={() => setShowSyncConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Google Calendar 동기화</h3>
            <p>Google Calendar와 동기화를 진행할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowSyncConfirm(false)}>
                취소
              </button>
              <button 
                className="modal-confirm" 
                onClick={async () => {
                  setShowSyncConfirm(false);
                  try {
                    const result = await syncWithGoogle();
                    if (result.success) {
                      alert('동기화가 완료되었습니다.');
                    } else {
                      alert(`동기화 실패: ${result.error}`);
                    }
                  } catch (error) {
                    alert('동기화 중 오류가 발생했습니다.');
                  }
                }}
                disabled={isSyncing}
              >
                {isSyncing ? '동기화 중...' : '동기화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스타일 관리 모달 */}
      {showStylingManager && (
        <StylingManager
          stickers={[]} // 🚨 더 이상 사용하지 않음 (스토어에서 직접 가져옴)
          onStickersChange={() => {}} // 🚨 더 이상 사용하지 않음
          onClose={() => setShowStylingManager(false)}
          isEditMode={stickerEditMode}
          onEditModeChange={setStickerEditMode}
          onSaveLayout={handleSaveLayout}
          onApplyLayout={handleApplyLayout}
          onDeleteLayout={handleDeleteLayout}
          onHeaderImageSave={handleHeaderImageSave}
        />
      )}

      {/* 플로팅 툴바 (편집 모드일 때만 표시) */}
      {stickerEditMode && (
        <FloatingToolbar
          stickers={[]} // 🚨 더 이상 사용하지 않음 (스토어에서 직접 가져옴)
          onSaveLayout={handleSaveLayout}
          onCancel={() => setStickerEditMode(false)}
          onAddSticker={handleAddSticker}
          uploadedStickers={uploadedStickers}
          onRemoveUploadedSticker={handleRemoveUploadedSticker}
          onAddStickerToCanvas={handleAddStickerToCanvas}
          onApplyLayout={handleApplyLayout}
        />
      )}
    </div>
  );
}

export default App;