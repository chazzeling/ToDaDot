/**
 * 투두 Firestore 서비스
 */
import { 
  getFirestoreInstance, 
  getTodosCollectionPath,
  getCurrentUser 
} from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { TodoItem } from '../types';

/**
 * 투두 저장
 */
export async function saveTodo(todo: TodoItem): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const todoRef = doc(firestore, getTodosCollectionPath(user.uid), todo.id);
  await setDoc(todoRef, {
    ...todo,
    createdAt: Timestamp.fromMillis(todo.createdAt),
    // updatedAt은 별도로 관리하지 않고 createdAt 사용
  }, { merge: true });
}

/**
 * 투두 불러오기 (단일)
 */
export async function getTodo(todoId: string): Promise<TodoItem | null> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const todoRef = doc(firestore, getTodosCollectionPath(user.uid), todoId);
  const snapshot = await getDoc(todoRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toMillis(),
  } as TodoItem;
}

/**
 * 모든 투두 불러오기
 */
export async function getAllTodos(): Promise<TodoItem[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const todosRef = collection(firestore, getTodosCollectionPath(user.uid));
  const q = query(todosRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
    } as TodoItem;
  });
}

/**
 * 날짜별 투두 불러오기
 */
export async function getTodosByDate(date: string): Promise<TodoItem[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const todosRef = collection(firestore, getTodosCollectionPath(user.uid));
  const q = query(todosRef, where('date', '==', date), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
    } as TodoItem;
  });
}

/**
 * 투두 삭제
 */
export async function deleteTodo(todoId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const todoRef = doc(firestore, getTodosCollectionPath(user.uid), todoId);
  await deleteDoc(todoRef);
}

/**
 * 여러 투두 일괄 저장 (마이그레이션용)
 */
export async function saveTodosBatch(todos: TodoItem[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  // Firestore는 한 번에 500개까지만 batch 작업 가능
  const batchSize = 500;
  for (let i = 0; i < todos.length; i += batchSize) {
    const batch = todos.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (todo) => {
        const todoRef = doc(firestore, getTodosCollectionPath(user.uid), todo.id);
        await setDoc(todoRef, {
          ...todo,
          createdAt: Timestamp.fromMillis(todo.createdAt),
        }, { merge: true });
      })
    );
  }
}






