/**
 * 설정 Firestore 서비스 (매트릭스 색상, 무드 커스텀 색상 등)
 */
import { 
  getFirestoreInstance, 
  getCurrentUser 
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  getDocs,
  Timestamp 
} from 'firebase/firestore';

export interface QuadrantColors {
  [key: string]: string;
}

export interface MoodCustomColor {
  color: string;
  name: string;
}

/**
 * 매트릭스 색상 저장
 */
export async function saveQuadrantColors(colors: QuadrantColors, preset?: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/quadrant-colors`);
  await setDoc(settingsRef, {
    colors,
    preset: preset || 'spring',
    updatedAt: Timestamp.now(),
  });
}

/**
 * 매트릭스 색상 불러오기
 */
export async function getQuadrantColors(): Promise<{ colors: QuadrantColors; preset: string } | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return null;
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/quadrant-colors`);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    colors: data.colors || {},
    preset: data.preset || 'spring',
  };
}

/**
 * 무드 커스텀 색상 저장
 */
export async function saveMoodCustomColors(colors: MoodCustomColor[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/mood-custom-colors`);
  await setDoc(settingsRef, {
    colors,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 무드 커스텀 색상 불러오기
 */
export async function getMoodCustomColors(): Promise<MoodCustomColor[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/mood-custom-colors`);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return [];
  }

  return snapshot.data().colors || [];
}

/**
 * 무드 색상 이름 저장
 */
export async function saveMoodColorNames(names: Record<string, string>): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/mood-color-names`);
  await setDoc(settingsRef, {
    names,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 무드 색상 이름 불러오기
 */
export async function getMoodColorNames(): Promise<Record<string, string>> {
  const user = getCurrentUser();
  if (!user) {
    return {};
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return {};
  }

  const settingsRef = doc(firestore, `users/${user.uid}/settings/mood-color-names`);
  const snapshot = await getDoc(settingsRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.data().names || {};
}

export interface MonthlyGoalItem {
  id: string;
  text: string;
  completed: boolean;
}

/**
 * 월별 목표 저장
 */
export async function saveMonthlyGoals(monthKey: string, goals: MonthlyGoalItem[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const goalsRef = doc(firestore, `users/${user.uid}/monthly-goals/${monthKey}`);
  await setDoc(goalsRef, {
    goals,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 월별 목표 불러오기
 */
export async function getMonthlyGoals(monthKey: string): Promise<MonthlyGoalItem[] | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return null;
  }

  const goalsRef = doc(firestore, `users/${user.uid}/monthly-goals/${monthKey}`);
  const snapshot = await getDoc(goalsRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data().goals || null;
}

/**
 * 모든 월별 목표 불러오기
 */
export async function getAllMonthlyGoals(): Promise<Record<string, MonthlyGoalItem[]>> {
  const user = getCurrentUser();
  if (!user) {
    return {};
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return {};
  }

  const goalsRef = collection(firestore, `users/${user.uid}/monthly-goals`);
  const snapshot = await getDocs(goalsRef);

  const result: Record<string, MonthlyGoalItem[]> = {};
  snapshot.docs.forEach(doc => {
    result[doc.id] = doc.data().goals || [];
  });

  return result;
}

