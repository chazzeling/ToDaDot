/**
 * 로컬 → Firebase 마이그레이션 테스트 유틸리티
 */
import { getCurrentUser } from '../firebase/firebase';
import * as todoService from '../firebase/todoService';

const STORAGE_KEY = 'eisenhower-todos';
const FIREBASE_SYNC_COMPLETED_KEY = 'firebase-todos-sync-completed';

/**
 * 로컬 투두 불러오기 (SQLite 메모 포함)
 */
async function loadLocalTodosWithMemos(): Promise<any[]> {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    
    // SQLite에서 메모 불러오기
    if (window.electronAPI) {
      const todosWithMemos = await Promise.all(
        parsed.map(async (todo: any) => {
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
}

/**
 * 로컬 → Firebase 마이그레이션 테스트 함수
 * 콘솔에서 window.migrateLocalToFirebase() 호출 가능
 */
export async function migrateLocalToFirebaseTest(force: boolean = false): Promise<{
  success: boolean;
  localCount: number;
  migratedCount: number;
  firebaseCount: number;
  errors?: any[];
}> {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated. Please log in first.');
    }

    // 강제 모드가 아니면 마이그레이션 완료 플래그 확인
    if (!force) {
      const syncCompleted = localStorage.getItem(FIREBASE_SYNC_COMPLETED_KEY);
      if (syncCompleted === 'true') {
        console.log('⚠️ Migration already completed. Use migrateLocalToFirebase(true) to force migration.');
        return {
          success: false,
          localCount: 0,
          migratedCount: 0,
          firebaseCount: 0,
          errors: [{ message: 'Migration already completed' }],
        };
      }
    }

    console.log('📦 Starting migration test...');
    
    // 1. 로컬 투두 불러오기
    const localTodos = await loadLocalTodosWithMemos();
    console.log(`📊 Local todos found: ${localTodos.length}`);
    
    if (localTodos.length === 0) {
      console.log('✅ No local todos to migrate.');
      localStorage.setItem(FIREBASE_SYNC_COMPLETED_KEY, 'true');
      return {
        success: true,
        localCount: 0,
        migratedCount: 0,
        firebaseCount: 0,
      };
    }

    // 2. 로컬 투두 데이터 검증
    console.log('🔍 Validating local todo data...');
    const validationErrors: any[] = [];
    localTodos.forEach((todo, index) => {
      if (!todo.id) validationErrors.push({ index, error: 'Missing id' });
      if (!todo.text) validationErrors.push({ index, error: 'Missing text' });
      if (typeof todo.completed !== 'boolean') validationErrors.push({ index, error: 'Invalid completed field' });
      if (!todo.date) validationErrors.push({ index, error: 'Missing date' });
      if (!todo.createdAt) validationErrors.push({ index, error: 'Missing createdAt' });
    });

    if (validationErrors.length > 0) {
      console.error('❌ Validation errors:', validationErrors);
      return {
        success: false,
        localCount: localTodos.length,
        migratedCount: 0,
        firebaseCount: 0,
        errors: validationErrors,
      };
    }

    console.log('✅ Local data validation passed');

    // 3. Firebase에 마이그레이션
    console.log('🚀 Migrating to Firebase...');
    try {
      await todoService.saveTodosBatch(localTodos);
      console.log(`✅ Successfully migrated ${localTodos.length} todos to Firebase`);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return {
        success: false,
        localCount: localTodos.length,
        migratedCount: 0,
        firebaseCount: 0,
        errors: [error],
      };
    }

    // 4. Firebase에서 검증
    console.log('🔍 Verifying migration in Firebase...');
    const firebaseTodos = await todoService.getAllTodos();
    console.log(`📊 Firebase todos found: ${firebaseTodos.length}`);

    // 5. 데이터 일치 확인
    const localIds = new Set(localTodos.map(t => t.id));
    const firebaseIds = new Set(firebaseTodos.map(t => t.id));
    
    const missingInFirebase = localTodos.filter(t => !firebaseIds.has(t.id));
    const extraInFirebase = firebaseTodos.filter(t => !localIds.has(t.id));

    if (missingInFirebase.length > 0) {
      console.warn('⚠️ Some todos are missing in Firebase:', missingInFirebase.map(t => ({ id: t.id, text: t.text })));
    }

    if (extraInFirebase.length > 0) {
      console.info('ℹ️ Some todos exist in Firebase but not in local (this is normal if migration was run before):', 
        extraInFirebase.map(t => ({ id: t.id, text: t.text })));
    }

    // 6. 필드 일치 확인 (샘플)
    if (firebaseTodos.length > 0 && localTodos.length > 0) {
      const sampleLocal = localTodos[0];
      const sampleFirebase = firebaseTodos.find(t => t.id === sampleLocal.id);
      
      if (sampleFirebase) {
        console.log('📋 Sample comparison:');
        console.log('  Local:', {
          id: sampleLocal.id,
          text: sampleLocal.text,
          completed: sampleLocal.completed,
          date: sampleLocal.date,
          quadrant: sampleLocal.quadrant,
          categoryId: sampleLocal.categoryId,
          memo: sampleLocal.memo ? 'present' : 'missing',
          time: sampleLocal.time,
        });
        console.log('  Firebase:', {
          id: sampleFirebase.id,
          text: sampleFirebase.text,
          completed: sampleFirebase.completed,
          date: sampleFirebase.date,
          quadrant: sampleFirebase.quadrant,
          categoryId: sampleFirebase.categoryId,
          memo: sampleFirebase.memo ? 'present' : 'missing',
          time: sampleFirebase.time,
        });
      }
    }

    // 7. 마이그레이션 완료 플래그 설정
    localStorage.setItem(FIREBASE_SYNC_COMPLETED_KEY, 'true');

    return {
      success: true,
      localCount: localTodos.length,
      migratedCount: localTodos.length,
      firebaseCount: firebaseTodos.length,
    };
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    return {
      success: false,
      localCount: 0,
      migratedCount: 0,
      firebaseCount: 0,
      errors: [error],
    };
  }
}

/**
 * 마이그레이션 플래그 리셋 (테스트용)
 */
export function resetMigrationFlag(): void {
  localStorage.removeItem(FIREBASE_SYNC_COMPLETED_KEY);
  console.log('✅ Migration flag reset. Next login will trigger migration again.');
}

/**
 * 로컬과 Firebase 투두 비교
 */
export async function compareLocalAndFirebase(): Promise<{
  localCount: number;
  firebaseCount: number;
  onlyInLocal: any[];
  onlyInFirebase: any[];
  different: any[];
}> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const localTodos = await loadLocalTodosWithMemos();
  const firebaseTodos = await todoService.getAllTodos();

  const localIds = new Set(localTodos.map(t => t.id));
  const firebaseIds = new Set(firebaseTodos.map(t => t.id));

  const onlyInLocal = localTodos.filter(t => !firebaseIds.has(t.id));
  const onlyInFirebase = firebaseTodos.filter(t => !localIds.has(t.id));

  // 내용이 다른 투두 찾기
  const different: any[] = [];
  localTodos.forEach(localTodo => {
    const firebaseTodo = firebaseTodos.find(t => t.id === localTodo.id);
    if (firebaseTodo && JSON.stringify(localTodo) !== JSON.stringify(firebaseTodo)) {
      different.push({
        id: localTodo.id,
        local: localTodo,
        firebase: firebaseTodo,
      });
    }
  });

  return {
    localCount: localTodos.length,
    firebaseCount: firebaseTodos.length,
    onlyInLocal,
    onlyInFirebase,
    different,
  };
}

// 전역 함수로 노출 (개발 및 테스트용)
if (typeof window !== 'undefined') {
  (window as any).migrateLocalToFirebase = migrateLocalToFirebaseTest;
  (window as any).resetMigrationFlag = resetMigrationFlag;
  (window as any).compareLocalAndFirebase = compareLocalAndFirebase;
  console.log('💡 Migration test functions available:');
  console.log('  - window.migrateLocalToFirebase(force?: boolean)');
  console.log('  - window.resetMigrationFlag()');
  console.log('  - window.compareLocalAndFirebase()');
}






