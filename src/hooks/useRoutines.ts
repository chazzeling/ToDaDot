import { useState, useCallback } from 'react';

const STORAGE_KEY = 'routines';

export interface Routine {
  id: string;
  text: string;
  createdAt: number;
  order?: number;
}

export function useRoutines() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load routines from localStorage:', error);
    }
    return [];
  });

  // 루틴 저장
  const saveRoutines = useCallback(async (updatedRoutines: Routine[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRoutines));
      setRoutines(updatedRoutines);
    } catch (error) {
      console.error('Failed to save routines to localStorage:', error);
      throw error;
    }
  }, []);

  // 루틴 추가
  const addRoutine = useCallback(async (text: string) => {
    const newRoutine: Routine = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text: text.trim(),
      createdAt: Date.now(),
    };

    const maxOrder = routines.length > 0 
      ? Math.max(...routines.map(r => r.order ?? 0))
      : -1;
    newRoutine.order = maxOrder + 1;

    const updatedRoutines = [...routines, newRoutine];
    await saveRoutines(updatedRoutines);
  }, [routines, saveRoutines]);

  // 루틴 수정
  const updateRoutine = useCallback(async (id: string, text: string) => {
    const updatedRoutines = routines.map((routine) =>
      routine.id === id ? { ...routine, text: text.trim() } : routine
    );
    await saveRoutines(updatedRoutines);
  }, [routines, saveRoutines]);

  // 루틴 템플릿 삭제
  // ⚠️ 중요: 이 함수는 루틴 템플릿만 삭제하며, 과거 날짜에 생성된 루틴 인스턴스(할 일)는 삭제하지 않습니다.
  // 
  // 🔒 보존 보장:
  // - 루틴 인스턴스는 todos 배열에 'routine-{routineId}-{date}' 형식의 ID로 저장됩니다.
  // - 이 함수는 루틴 템플릿 배열(routines)에서만 항목을 제거하며, todos 배열에는 접근하지 않습니다.
  // - 템플릿이 삭제되면 다음 날부터 새로운 루틴 인스턴스가 생성되지 않지만, 기존 기록은 절대 삭제되지 않습니다.
  //
  // 🚫 금지 사항:
  // - 이 함수 내부에서 todos 배열에 접근하거나 루틴 인스턴스를 삭제하는 코드를 추가하지 마세요.
  // - SQL 데이터베이스의 경우 ON DELETE CASCADE 옵션을 사용하지 마세요.
  // - 이 함수는 오직 루틴 템플릿 배열만 수정합니다.
  const deleteRoutine = useCallback(async (id: string) => {
    // ✅ 루틴 템플릿 배열에서만 제거 (인스턴스는 건드리지 않음)
    // ⚠️ 절대 todos 배열이나 루틴 인스턴스에 대한 삭제 작업을 수행하지 않습니다.
    const updatedRoutines = routines.filter((routine) => routine.id !== id);
    await saveRoutines(updatedRoutines);
    
    // 🔒 검증: 이 함수가 인스턴스 삭제를 수행하지 않았음을 확인
    // (향후 실수로 추가된 코드를 방지하기 위한 문서화)
  }, [routines, saveRoutines]);

  // 루틴 순서 변경
  const reorderRoutines = useCallback(async (draggedId: string, targetId: string) => {
    const draggedIndex = routines.findIndex(r => r.id === draggedId);
    const targetIndex = routines.findIndex(r => r.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedRoutines = [...routines];
    const [dragged] = updatedRoutines.splice(draggedIndex, 1);
    updatedRoutines.splice(targetIndex, 0, dragged);

    // order 업데이트
    updatedRoutines.forEach((routine, index) => {
      routine.order = index;
    });

    await saveRoutines(updatedRoutines);
  }, [routines, saveRoutines]);

  // 루틴을 할 일로 변환 (오늘 날짜)
  const convertRoutineToTodo = useCallback((routineId: string, _date: string): Routine | null => {
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return null;
    return routine;
  }, [routines]);

  return {
    routines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    reorderRoutines,
    convertRoutineToTodo,
  };
}

