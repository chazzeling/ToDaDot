/**
 * 루틴 Firestore 서비스
 */
import { 
  getFirestoreInstance, 
  getCurrentUser 
} from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  query,
  orderBy,
  getDocs,
  Timestamp 
} from 'firebase/firestore';

export interface Routine {
  id: string;
  text: string;
  createdAt: number;
  order?: number;
}

/**
 * 루틴 저장
 */
export async function saveRoutine(routine: Routine): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const routineRef = doc(firestore, `users/${user.uid}/routines/${routine.id}`);
  await setDoc(routineRef, {
    ...routine,
    createdAt: Timestamp.fromMillis(routine.createdAt),
    updatedAt: Timestamp.now(),
  });
}

/**
 * 모든 루틴 불러오기
 */
export async function getAllRoutines(): Promise<Routine[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const routinesRef = collection(firestore, `users/${user.uid}/routines`);
  const q = query(routinesRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
    } as Routine;
  });
}

/**
 * 루틴 삭제
 */
export async function deleteRoutine(routineId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const routineRef = doc(firestore, `users/${user.uid}/routines/${routineId}`);
  await deleteDoc(routineRef);
}

/**
 * 여러 루틴 일괄 저장
 */
export async function saveRoutinesBatch(routines: Routine[]): Promise<void> {
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
  for (let i = 0; i < routines.length; i += batchSize) {
    const batch = routines.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (routine) => {
        const routineRef = doc(firestore, `users/${user.uid}/routines/${routine.id}`);
        await setDoc(routineRef, {
          ...routine,
          createdAt: Timestamp.fromMillis(routine.createdAt),
          updatedAt: Timestamp.now(),
        });
      })
    );
  }
}

