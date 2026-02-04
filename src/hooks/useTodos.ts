import { useState, useEffect, useCallback } from 'react';
import { TodoItem, Quadrant, DateString } from '../types';
import { useFirebaseAuth } from './useFirebaseAuth';
import * as todoService from '../firebase/todoService';

const STORAGE_KEY = 'eisenhower-todos';
const FIREBASE_SYNC_COMPLETED_KEY = 'firebase-todos-sync-completed';

export function useTodos() {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<DateString>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // 로컬 스토리지에서 투두 불러오기
  const loadTodosFromLocalStorage = useCallback(async (): Promise<TodoItem[]> => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved) as TodoItem[];
      
      // SQLite에서 메모 불러오기
      if (window.electronAPI) {
        const todosWithMemos = await Promise.all(
          parsed.map(async (todo: TodoItem) => {
            try {
              const memoData = await window.electronAPI!.dbGetMemo(todo.id);
              if (memoData) {
                return { ...todo, memo: memoData.content };
              }
              return todo;
            } catch (error) {
              console.error(`Failed to load memo for todo ${todo.id}:`, error);
              return todo;
            }
          })
        );
        return todosWithMemos;
      }
      return parsed;
    } catch (error) {
      console.error('Failed to load todos from localStorage:', error);
      return [];
    }
  }, []);

  // Firebase에서 투두 불러오기
  const loadTodosFromFirebase = useCallback(async (): Promise<TodoItem[]> => {
    if (!isAuthenticated || !user) {
      return [];
    }

    try {
      const firebaseTodos = await todoService.getAllTodos();
      
      // SQLite에서 메모 불러오기 (Firebase에는 메모가 없으므로)
      if (window.electronAPI) {
        const todosWithMemos = await Promise.all(
          firebaseTodos.map(async (todo: TodoItem) => {
            try {
              const memoData = await window.electronAPI!.dbGetMemo(todo.id);
              if (memoData) {
                return { ...todo, memo: memoData.content };
              }
              return todo;
            } catch (error) {
              console.error(`Failed to load memo for todo ${todo.id}:`, error);
              return todo;
            }
          })
        );
        return todosWithMemos;
      }
      return firebaseTodos;
    } catch (error) {
      console.error('Failed to load todos from Firebase:', error);
      // Firebase 실패 시 로컬로 폴백
      return loadTodosFromLocalStorage();
    }
  }, [isAuthenticated, user, loadTodosFromLocalStorage]);

  // 로컬 → Firebase 마이그레이션
  const migrateLocalToFirebase = useCallback(async () => {
    if (!isAuthenticated || !user) {
      return;
    }

    // 이미 마이그레이션 완료 확인
    const syncCompleted = localStorage.getItem(FIREBASE_SYNC_COMPLETED_KEY);
    if (syncCompleted === 'true') {
      return;
    }

    try {
      // 로컬 투두 가져오기
      const localTodos = await loadTodosFromLocalStorage();
      
      if (localTodos.length === 0) {
        // 로컬에 투두가 없으면 마이그레이션 완료로 표시
        localStorage.setItem(FIREBASE_SYNC_COMPLETED_KEY, 'true');
        return;
      }

      // Firebase에 일괄 저장
      await todoService.saveTodosBatch(localTodos);
      
      console.log(`✅ Migrated ${localTodos.length} todos to Firebase`);
      localStorage.setItem(FIREBASE_SYNC_COMPLETED_KEY, 'true');
    } catch (error) {
      console.error('Failed to migrate todos to Firebase:', error);
    }
  }, [isAuthenticated, user, loadTodosFromLocalStorage]);

  // 투두 불러오기 (Firebase 또는 로컬)
  useEffect(() => {
    const loadTodos = async () => {
      if (isAuthenticated && user) {
        // 먼저 로컬 데이터 불러오기
        const localTodos = await loadTodosFromLocalStorage();
        
        // Firebase에서 불러오기
        const firebaseTodos = await loadTodosFromFirebase();
        
        // 로컬 데이터와 Firestore 데이터 병합 (로컬 데이터 우선)
        // Firestore에 없는 로컬 데이터는 유지
        const firebaseMap = new Map(firebaseTodos.map(t => [t.id, t]));
        const mergedTodos = [...firebaseTodos];
        
        // 로컬에만 있는 투두 추가
        localTodos.forEach(localTodo => {
          if (!firebaseMap.has(localTodo.id)) {
            mergedTodos.push(localTodo);
          }
        });
        
        setTodos(mergedTodos);
        
        // 병합된 데이터를 localStorage에 저장 (로컬 데이터 보존)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTodos));
        
        // 마이그레이션은 사용자가 팝업에서 확인한 후에만 실행
        // (App.tsx에서 handleImportLocalData로 처리)
      } else {
        // 로컬에서 불러오기
        const localTodos = await loadTodosFromLocalStorage();
        setTodos(localTodos);
      }
    };

    loadTodos();
  }, [isAuthenticated, user, loadTodosFromFirebase, loadTodosFromLocalStorage]);

  // 투두 저장 (Firebase + 로컬)
  const saveTodos = useCallback(async (updatedTodos: TodoItem[]) => {
    // 로컬 저장 (백업)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTodos));

    // Firebase 저장 (인증된 경우)
    if (isAuthenticated && user) {
      try {
        // 현재 상태와 비교하여 변경 사항 감지
        const currentMap = new Map(todos.map(t => [t.id, t]));
        const updatedMap = new Map(updatedTodos.map(t => [t.id, t]));
        
        // 새로 추가되거나 수정된 투두
        const toSave: TodoItem[] = [];
        updatedTodos.forEach(todo => {
          const current = currentMap.get(todo.id);
          // 새 투두이거나 내용이 변경된 경우
          if (!current || JSON.stringify(current) !== JSON.stringify(todo)) {
            toSave.push(todo);
          }
        });
        
        // 삭제된 투두
        const toDelete: TodoItem[] = [];
        todos.forEach(todo => {
          if (!updatedMap.has(todo.id)) {
            toDelete.push(todo);
          }
        });

        // 저장 및 삭제 작업 (병렬 실행)
        const operations: Promise<void>[] = [];
        
        if (toSave.length > 0) {
          operations.push(...toSave.map(todo => todoService.saveTodo(todo).catch(err => {
            console.error(`Failed to save todo ${todo.id}:`, err);
            throw err;
          })));
        }
        
        if (toDelete.length > 0) {
          operations.push(...toDelete.map(todo => todoService.deleteTodo(todo.id).catch(err => {
            console.error(`Failed to delete todo ${todo.id}:`, err);
            throw err;
          })));
        }

        if (operations.length > 0) {
          await Promise.all(operations);
          console.log(`✅ Firebase sync: ${toSave.length} saved, ${toDelete.length} deleted`);
        }
      } catch (error) {
        console.error('Failed to save todos to Firebase:', error);
        // 에러 발생해도 로컬은 저장되어 있으므로 계속 진행
      }
    }
  }, [isAuthenticated, user, todos]);

  // 로컬 스토리지에 저장 (백업)
  useEffect(() => {
    if (todos.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    }
  }, [todos]);

  // 선택된 날짜의 투두만 필터링
  const getTodosForDate = useCallback((date: DateString) => {
    return todos.filter((todo) => todo.date === date);
  }, [todos]);

  // 사분면으로 투두 추가
  const addTodoByQuadrant = useCallback(async (quadrant: Quadrant, text: string) => {
    // 같은 quadrant의 todos 찾기
    const quadrantTodos = todos.filter(t => t.quadrant === quadrant && t.date === selectedDate);
    
    // order가 있는 todos의 최소 order 찾기
    const todosWithOrder = quadrantTodos.filter(t => t.order !== undefined && t.order !== null);
    const minOrder = todosWithOrder.length > 0 
      ? Math.min(...todosWithOrder.map(t => t.order!))
      : -1; // order가 없으면 -1부터 시작
    
    const newTodo: TodoItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      createdAt: Date.now(),
      date: selectedDate,
      quadrant,
      order: minOrder - 1, // 맨 위에 오도록 order를 더 작게 설정
    };

    // 맨 앞에 추가
    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, selectedDate, saveTodos]);

  // 카테고리로 투두 추가
  const addTodoByCategory = useCallback(async (categoryId: string, text: string) => {
    // 같은 category의 todos 찾기
    const categoryTodos = todos.filter(t => t.categoryId === categoryId && t.date === selectedDate);
    
    // order가 있는 todos의 최소 order 찾기
    const todosWithOrder = categoryTodos.filter(t => t.order !== undefined && t.order !== null);
    const minOrder = todosWithOrder.length > 0 
      ? Math.min(...todosWithOrder.map(t => t.order!))
      : -1; // order가 없으면 -1부터 시작
    
    const newTodo: TodoItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      createdAt: Date.now(),
      date: selectedDate,
      categoryId,
      order: minOrder - 1, // 맨 위에 오도록 order를 더 작게 설정
    };

    // 맨 앞에 추가
    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, selectedDate, saveTodos]);

  // 바텀시트로 투두 추가
  const addTodoFromBottomSheet = useCallback(async (
    text: string,
    quadrant?: Quadrant,
    categoryId?: string
  ) => {
    const newTodo: TodoItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      completed: false,
      createdAt: Date.now(),
      date: selectedDate,
      quadrant,
      categoryId,
    };

    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, selectedDate, saveTodos]);

  // 투두 완료/미완료 토글
  const toggleTodo = useCallback(async (id: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 투두 삭제
  const deleteTodo = useCallback(async (id: string) => {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 사분면 이동
  const moveTodoToQuadrant = useCallback(async (id: string, newQuadrant: Quadrant) => {
    console.log(`🔄 moveTodoToQuadrant: id=${id}, newQuadrant=${newQuadrant}`);
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, quadrant: newQuadrant } : todo
    );
    setTodos(updatedTodos);
    try {
      await saveTodos(updatedTodos);
      console.log(`✅ moveTodoToQuadrant 완료: ${id}`);
    } catch (error) {
      console.error(`❌ moveTodoToQuadrant 실패: ${id}`, error);
      throw error;
    }
  }, [todos, saveTodos]);

  // 카테고리 이동
  const moveTodoToCategory = useCallback(async (id: string, newCategoryId: string | null) => {
    console.log(`🔄 moveTodoToCategory: id=${id}, newCategoryId=${newCategoryId || 'null (미분류)'}`);
    // 'uncategorized' 문자열을 null로 변환 (실제 데이터베이스에서는 null로 저장)
    const actualCategoryId = newCategoryId === 'uncategorized' ? null : newCategoryId;
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, categoryId: actualCategoryId } : todo
    );
    setTodos(updatedTodos);
    try {
      await saveTodos(updatedTodos);
      console.log(`✅ moveTodoToCategory 완료: ${id}, categoryId=${actualCategoryId || 'null'}`);
    } catch (error) {
      console.error(`❌ moveTodoToCategory 실패: ${id}`, error);
      throw error;
    }
  }, [todos, saveTodos]);

  // 같은 사분면 내에서 순서 변경
  const reorderTodoInQuadrant = useCallback(async (draggedId: string, targetId: string, quadrant: Quadrant) => {
    const quadrantTodos = todos.filter((todo) => {
      if (quadrant === 'uncategorized') {
        return !todo.quadrant || todo.quadrant === 'uncategorized';
      }
      return todo.quadrant === quadrant;
    }).filter(todo => todo.date === todos.find(t => t.id === draggedId)?.date);

    // order가 없으면 createdAt 기준으로 초기화
    const todosWithOrder = quadrantTodos.map((todo, index) => ({
      ...todo,
      order: todo.order ?? index,
    })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const draggedIndex = todosWithOrder.findIndex(t => t.id === draggedId);
    const targetIndex = todosWithOrder.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newOrder = [...todosWithOrder];
    const [draggedTodo] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTodo);

    // order 재할당
    const reorderedTodos = newOrder.map((todo, index) => ({
      ...todo,
      order: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 같은 카테고리 내에서 순서 변경
  const reorderTodoInCategory = useCallback(async (draggedId: string, targetId: string, categoryId: string) => {
    const categoryTodos = todos.filter((todo) => todo.categoryId === categoryId)
      .filter(todo => todo.date === todos.find(t => t.id === draggedId)?.date);

    // order가 없으면 createdAt 기준으로 초기화
    const todosWithOrder = categoryTodos.map((todo, index) => ({
      ...todo,
      order: todo.order ?? index,
    })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const draggedIndex = todosWithOrder.findIndex(t => t.id === draggedId);
    const targetIndex = todosWithOrder.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newOrder = [...todosWithOrder];
    const [draggedTodo] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTodo);

    // order 재할당
    const reorderedTodos = newOrder.map((todo, index) => ({
      ...todo,
      order: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 투두 텍스트 수정
  const editTodoText = useCallback(async (id: string, text: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, text } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 날짜 변경
  const changeTodoDate = useCallback(async (id: string, newDate: DateString) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, date: newDate } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 메모 추가/수정 (SQLite에 저장, Firebase에는 투두 업데이트로 반영)
  const updateTodoMemo = useCallback(async (id: string, memo: string) => {
    // SQLite에 저장
    if (window.electronAPI) {
      try {
        await window.electronAPI.dbSaveMemo(id, memo);
      } catch (error) {
        console.error('Failed to save memo to database:', error);
      }
    }

    // 투두 상태 업데이트
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, memo } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 메모 삭제
  const deleteTodoMemo = useCallback(async (id: string) => {
    // SQLite에서 삭제
    if (window.electronAPI) {
      try {
        await window.electronAPI.dbDeleteMemo(id);
      } catch (error) {
        console.error('Failed to delete memo from database:', error);
      }
    }

    // 투두 상태 업데이트
    const updatedTodos = todos.map((todo) => {
      if (todo.id === id) {
        const { memo, ...rest } = todo;
        return rest;
      }
      return todo;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 시간 설정
  const setTodoTime = useCallback(async (id: string, time: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, time } : todo
    );
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 시간 삭제
  const deleteTodoTime = useCallback(async (id: string) => {
    const updatedTodos = todos.map((todo) => {
      if (todo.id === id) {
        const { time, ...rest } = todo;
        return rest;
      }
      return todo;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 오늘 날짜 확인
  const getTodayDateString = useCallback((): DateString => {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
    const year = koreaTime.getUTCFullYear();
    const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // 내일 날짜 문자열 반환
  const getTomorrowDateString = useCallback((): DateString => {
    const today = getTodayDateString();
    const [year, month, day] = today.split('-').map(Number);
    const tomorrow = new Date(year, month - 1, day + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  }, [getTodayDateString]);

  // 미완료 항목을 내일로 보내기
  const moveIncompleteTodosToTomorrow = useCallback(async (date: DateString) => {
    const tomorrow = getTomorrowDateString();
    const updatedTodos = todos.map((todo) => {
      if (todo.date === date && !todo.completed) {
        return { ...todo, date: tomorrow };
      }
      return todo;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, getTomorrowDateString, saveTodos]);

  // 미완료 항목을 오늘로 보내기
  const moveIncompleteTodosToToday = useCallback(async (date: DateString) => {
    const today = getTodayDateString();
    const updatedTodos = todos.map((todo) => {
      if (todo.date === date && !todo.completed) {
        return { ...todo, date: today };
      }
      return todo;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, getTodayDateString, saveTodos]);

  // 미완료 항목을 특정 날짜로 보내기
  const moveIncompleteTodosToDate = useCallback(async (date: DateString, targetDate: DateString) => {
    const updatedTodos = todos.map((todo) => {
      if (todo.date === date && !todo.completed) {
        return { ...todo, date: targetDate };
      }
      return todo;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 미완료 항목 삭제
  const deleteIncompleteTodos = useCallback(async (date: DateString) => {
    const updatedTodos = todos.filter((todo) => !(todo.date === date && !todo.completed));
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 모든 항목 삭제
  const deleteAllTodos = useCallback(async (date: DateString) => {
    const updatedTodos = todos.filter((todo) => todo.date !== date);
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // Daily Focus 토글
  const toggleTodayFocus = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodos = todos.map((t) => {
      if (t.id === id) {
        const newIsTodayFocus = !(t.isTodayFocus ?? false);
        // focusOrder 계산: true로 설정될 때 현재 가장 큰 focusOrder + 1, false일 때는 null
        let newFocusOrder: number | null = null;
        if (newIsTodayFocus) {
          const maxFocusOrder = todos
            .filter(t => t.isTodayFocus && t.focusOrder !== null && t.focusOrder !== undefined)
            .reduce((max, t) => Math.max(max, t.focusOrder ?? 0), -1);
          newFocusOrder = maxFocusOrder + 1;
        }
        return { ...t, isTodayFocus: newIsTodayFocus, focusOrder: newFocusOrder };
      }
      return t;
    });
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // Daily Focus 순서 변경
  const reorderFocusTodos = useCallback(async (draggedId: string, targetId: string) => {
    const focusTodos = todos
      .filter(todo => todo.isTodayFocus === true)
      .map((todo, index) => ({
        ...todo,
        focusOrder: todo.focusOrder ?? index,
      }))
      .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

    const draggedIndex = focusTodos.findIndex(t => t.id === draggedId);
    const targetIndex = focusTodos.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

    const newOrder = [...focusTodos];
    const [draggedTodo] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTodo);

    // focusOrder 재할당
    const reorderedFocusTodos = newOrder.map((todo, index) => ({
      ...todo,
      focusOrder: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedFocusTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // Daily Focus 리셋
  const resetTodayFocus = useCallback(async () => {
    const updatedTodos = todos.map((todo) => ({
      ...todo,
      isTodayFocus: false,
      focusOrder: null,
    }));
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // Daily Focus 완료된 할 일을 맨 아래로 정리
  const organizeFocusTodos = useCallback(async () => {
    const focusTodos = todos
      .filter(todo => todo.isTodayFocus === true)
      .map((todo, index) => ({
        ...todo,
        focusOrder: todo.focusOrder ?? index,
      }))
      .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

    // 완료되지 않은 할 일과 완료된 할 일 분리
    const incompleteTodos = focusTodos.filter(todo => !todo.completed);
    const completedTodos = focusTodos.filter(todo => todo.completed);

    // 완료되지 않은 할 일을 먼저, 완료된 할 일을 나중에 배치
    const organizedTodos = [...incompleteTodos, ...completedTodos];

    // focusOrder 재할당
    const reorderedFocusTodos = organizedTodos.map((todo, index) => ({
      ...todo,
      focusOrder: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedFocusTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 특정 Quadrant 내에서 완료된 할 일을 맨 아래로 정리
  const organizeTodosInQuadrant = useCallback(async (quadrant: Quadrant, date: string) => {
    const quadrantTodos = todos
      .filter(todo => {
        if (quadrant === 'uncategorized') {
          return (!todo.quadrant || todo.quadrant === 'uncategorized') && todo.date === date;
        }
        return todo.quadrant === quadrant && todo.date === date;
      })
      .map((todo, index) => ({
        ...todo,
        order: todo.order ?? index,
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // 완료되지 않은 할 일과 완료된 할 일 분리
    const incompleteTodos = quadrantTodos.filter(todo => !todo.completed);
    const completedTodos = quadrantTodos.filter(todo => todo.completed);

    // 완료되지 않은 할 일을 먼저, 완료된 할 일을 나중에 배치
    const organizedTodos = [...incompleteTodos, ...completedTodos];

    // order 재할당
    const reorderedTodos = organizedTodos.map((todo, index) => ({
      ...todo,
      order: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 특정 Category 내에서 완료된 할 일을 맨 아래로 정리
  const organizeTodosInCategory = useCallback(async (categoryId: string, date: string) => {
    const categoryTodos = todos
      .filter(todo => {
        if (categoryId === 'uncategorized') {
          return (!todo.categoryId || todo.categoryId === 'uncategorized') && todo.date === date;
        }
        return todo.categoryId === categoryId && todo.date === date;
      })
      .map((todo, index) => ({
        ...todo,
        order: todo.order ?? index,
      }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // 완료되지 않은 할 일과 완료된 할 일 분리
    const incompleteTodos = categoryTodos.filter(todo => !todo.completed);
    const completedTodos = categoryTodos.filter(todo => todo.completed);

    // 완료되지 않은 할 일을 먼저, 완료된 할 일을 나중에 배치
    const organizedTodos = [...incompleteTodos, ...completedTodos];

    // order 재할당
    const reorderedTodos = organizedTodos.map((todo, index) => ({
      ...todo,
      order: index,
    }));

    // 전체 todos 배열 업데이트
    const updatedTodos = todos.map((todo) => {
      const reordered = reorderedTodos.find(r => r.id === todo.id);
      return reordered ? reordered : todo;
    });

    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // Daily Focus 투두 목록 가져오기
  const getTodayFocusTodos = useCallback((): TodoItem[] => {
    return todos
      .filter(todo => todo.isTodayFocus === true)
      .map((todo, index) => ({
        ...todo,
        focusOrder: todo.focusOrder ?? index,
      }))
      .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));
  }, [todos]);

  // 완료된 할 일을 "진짜 오늘 날짜"로 복제
  const duplicateTodoToday = useCallback(async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const today: DateString = getTodayDateString();

    const newTodo: TodoItem = {
      ...todo,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: today,
      completed: false,
      createdAt: Date.now(),
      isTodayFocus: false,
      focusOrder: undefined,
    };

    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, getTodayDateString, saveTodos]);

  // 완료된 할 일을 다른 날로 복제
  const duplicateTodoToDate = useCallback(async (id: string, targetDate: DateString) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newTodo: TodoItem = {
      ...todo,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      date: targetDate,
      completed: false,
      createdAt: Date.now(),
      isTodayFocus: false,
      focusOrder: undefined,
    };

    const updatedTodos = [...todos, newTodo];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  // 특정 ID로 할 일 추가 (루틴용)
  const addTodoWithId = useCallback(async (todo: TodoItem) => {
    // 이미 같은 ID의 할 일이 있으면 추가하지 않음
    if (todos.find(t => t.id === todo.id)) {
      return;
    }
    const updatedTodos = [...todos, todo];
    setTodos(updatedTodos);
    await saveTodos(updatedTodos);
  }, [todos, saveTodos]);

  return {
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
  };
}