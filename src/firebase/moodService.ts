/**
 * 무드 트래커 Firestore 서비스
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
  where,
  orderBy,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { DateString } from '../types';

export interface MoodData {
  date: DateString;
  color: string;
}

/**
 * 무드 저장
 */
export async function saveMood(mood: MoodData): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const moodRef = doc(firestore, `users/${user.uid}/moods/${mood.date}`);
  await setDoc(moodRef, {
    ...mood,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 무드 불러오기 (날짜별)
 */
export async function getMood(date: DateString): Promise<MoodData | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return null;
  }

  const moodRef = doc(firestore, `users/${user.uid}/moods/${date}`);
  const snapshot = await getDoc(moodRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    date: data.date,
    color: data.color,
  } as MoodData;
}

/**
 * 모든 무드 불러오기
 */
export async function getAllMoods(): Promise<MoodData[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const moodsRef = collection(firestore, `users/${user.uid}/moods`);
  const q = query(moodsRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    date: doc.data().date,
    color: doc.data().color,
  } as MoodData));
}

/**
 * 무드 삭제
 */
export async function deleteMood(date: DateString): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const moodRef = doc(firestore, `users/${user.uid}/moods/${date}`);
  await deleteDoc(moodRef);
}

/**
 * 여러 무드 일괄 저장
 */
export async function saveMoodsBatch(moods: MoodData[]): Promise<void> {
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
  for (let i = 0; i < moods.length; i += batchSize) {
    const batch = moods.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (mood) => {
        const moodRef = doc(firestore, `users/${user.uid}/moods/${mood.date}`);
        await setDoc(moodRef, {
          ...mood,
          updatedAt: Timestamp.now(),
        });
      })
    );
  }
}

