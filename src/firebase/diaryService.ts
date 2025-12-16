/**
 * 일기/메모 Firestore 서비스
 */
import { 
  getFirestoreInstance, 
  getDiariesCollectionPath, 
  getMemosCollectionPath,
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
import { Diary, Memo } from '../types';

/**
 * 일기 저장
 */
export async function saveDiary(diary: Diary): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const diaryRef = doc(firestore, getDiariesCollectionPath(user.uid), diary.id);
  await setDoc(diaryRef, {
    ...diary,
    createdAt: Timestamp.fromMillis(diary.createdAt),
    updatedAt: Timestamp.fromMillis(diary.updatedAt),
  });
}

/**
 * 일기 불러오기 (단일)
 */
export async function getDiary(diaryId: string): Promise<Diary | null> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const diaryRef = doc(firestore, getDiariesCollectionPath(user.uid), diaryId);
  const snapshot = await getDoc(diaryRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    updatedAt: (data.updatedAt as Timestamp).toMillis(),
  } as Diary;
}

/**
 * 모든 일기 불러오기
 */
export async function getAllDiaries(): Promise<Diary[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const diariesRef = collection(firestore, getDiariesCollectionPath(user.uid));
  const q = query(diariesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Diary;
  });
}

/**
 * 날짜별 일기 불러오기
 */
export async function getDiariesByDate(date: string): Promise<Diary[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const diariesRef = collection(firestore, getDiariesCollectionPath(user.uid));
  const q = query(diariesRef, where('date', '==', date), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Diary;
  });
}

/**
 * 일기 삭제
 */
export async function deleteDiary(diaryId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const diaryRef = doc(firestore, getDiariesCollectionPath(user.uid), diaryId);
  await deleteDoc(diaryRef);
}

/**
 * 메모 저장
 */
export async function saveMemo(memo: Memo): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const memoRef = doc(firestore, getMemosCollectionPath(user.uid), memo.id);
  await setDoc(memoRef, {
    ...memo,
    createdAt: Timestamp.fromMillis(memo.createdAt),
    updatedAt: Timestamp.fromMillis(memo.updatedAt),
  });
}

/**
 * 메모 불러오기 (단일)
 */
export async function getMemo(memoId: string): Promise<Memo | null> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const memoRef = doc(firestore, getMemosCollectionPath(user.uid), memoId);
  const snapshot = await getDoc(memoRef);
  
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    updatedAt: (data.updatedAt as Timestamp).toMillis(),
  } as Memo;
}

/**
 * 모든 메모 불러오기
 */
export async function getAllMemos(): Promise<Memo[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const memosRef = collection(firestore, getMemosCollectionPath(user.uid));
  const q = query(memosRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Memo;
  });
}

/**
 * 날짜별 메모 불러오기
 */
export async function getMemosByDate(date: string): Promise<Memo[]> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const memosRef = collection(firestore, getMemosCollectionPath(user.uid));
  const q = query(memosRef, where('date', '==', date), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Memo;
  });
}

/**
 * 메모 삭제
 */
export async function deleteMemo(memoId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const memoRef = doc(firestore, getMemosCollectionPath(user.uid), memoId);
  await deleteDoc(memoRef);
}

/**
 * 여러 일기 일괄 저장 (마이그레이션용)
 */
export async function saveDiariesBatch(diaries: Diary[]): Promise<void> {
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
  for (let i = 0; i < diaries.length; i += batchSize) {
    const batch = diaries.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (diary) => {
        const diaryRef = doc(firestore, getDiariesCollectionPath(user.uid), diary.id);
        await setDoc(diaryRef, {
          ...diary,
          createdAt: Timestamp.fromMillis(diary.createdAt),
          updatedAt: Timestamp.fromMillis(diary.updatedAt),
        });
      })
    );
  }
}

/**
 * 여러 메모 일괄 저장 (마이그레이션용)
 */
export async function saveMemosBatch(memos: Memo[]): Promise<void> {
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
  for (let i = 0; i < memos.length; i += batchSize) {
    const batch = memos.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (memo) => {
        const memoRef = doc(firestore, getMemosCollectionPath(user.uid), memo.id);
        await setDoc(memoRef, {
          ...memo,
          createdAt: Timestamp.fromMillis(memo.createdAt),
          updatedAt: Timestamp.fromMillis(memo.updatedAt),
        });
      })
    );
  }
}

