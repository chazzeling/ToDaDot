/**
 * 시간 계획/기록 Firestore 서비스
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
  getDocs,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { TimePlannerData, TimePlannerCategory, TimeBlock, DateString } from '../types';

/**
 * 시간 계획 데이터 저장
 */
export async function saveTimePlannerData(data: TimePlannerData): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const dataRef = doc(firestore, `users/${user.uid}/time-planner-data/${data.date}`);
  const dataToSave = {
    date: data.date,
    blocks: data.blocks || [],
    categories: data.categories || [],
    updatedAt: Timestamp.now(),
  };
  console.log('💾 Saving time planner data to Firestore:', data.date, 'blocks:', dataToSave.blocks.length);
  await setDoc(dataRef, dataToSave);
}

/**
 * 시간 계획 데이터 불러오기 (날짜별)
 */
export async function getTimePlannerData(date: DateString): Promise<TimePlannerData | null> {
  console.log('🔍 getTimePlannerData called for date:', date);
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ No user authenticated');
    return null;
  }
  console.log('✅ User authenticated:', user.uid);

  const firestore = getFirestoreInstance();
  if (!firestore) {
    console.log('❌ Firestore not initialized');
    return null;
  }
  console.log('✅ Firestore initialized');

  const dataRef = doc(firestore, `users/${user.uid}/time-planner-data/${date}`);
  console.log('📄 Fetching document from path:', `users/${user.uid}/time-planner-data/${date}`);
  const snapshot = await getDoc(dataRef);

  if (!snapshot.exists()) {
    console.log('ℹ️ No time planner data found in Firestore for:', date);
    return null;
  }

  const data = snapshot.data();
  console.log('📥 Raw data from Firestore:', data);
  const result = {
    date: data.date,
    blocks: data.blocks || [],
    categories: data.categories || [],
  } as TimePlannerData;
  console.log('📥 Retrieved time planner data from Firestore:', result.date, 'blocks:', result.blocks.length, 'blocks array:', result.blocks);
  return result;
}

/**
 * 모든 시간 계획 데이터 불러오기
 */
export async function getAllTimePlannerData(): Promise<TimePlannerData[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const dataRef = collection(firestore, `users/${user.uid}/time-planner-data`);
  const snapshot = await getDocs(dataRef);

  return snapshot.docs.map(doc => ({
    date: doc.id,
    blocks: doc.data().blocks || [],
    categories: doc.data().categories || [],
  } as TimePlannerData));
}

/**
 * 시간 계획 카테고리 저장 (전역 설정)
 */
export async function saveTimePlannerCategories(categories: TimePlannerCategory[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoriesRef = doc(firestore, `users/${user.uid}/time-planner-categories/default`);
  await setDoc(categoriesRef, {
    categories,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 시간 계획 카테고리 불러오기
 */
export async function getTimePlannerCategories(): Promise<TimePlannerCategory[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const categoriesRef = doc(firestore, `users/${user.uid}/time-planner-categories/default`);
  const snapshot = await getDoc(categoriesRef);

  if (!snapshot.exists()) {
    return [];
  }

  return snapshot.data().categories || [];
}

/**
 * 시간 기록 데이터 저장
 */
export async function saveTimeRecordData(data: TimePlannerData): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const dataRef = doc(firestore, `users/${user.uid}/time-record-data/${data.date}`);
  const dataToSave = {
    date: data.date,
    blocks: data.blocks || [],
    categories: data.categories || [],
    updatedAt: Timestamp.now(),
  };
  console.log('💾 Saving time record data to Firestore:', data.date, 'blocks:', dataToSave.blocks.length, 'data:', dataToSave);
  await setDoc(dataRef, dataToSave);
}

/**
 * 시간 기록 데이터 불러오기 (날짜별)
 */
export async function getTimeRecordData(date: DateString): Promise<TimePlannerData | null> {
  console.log('🔍 getTimeRecordData called for date:', date);
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ No user authenticated');
    return null;
  }
  console.log('✅ User authenticated:', user.uid);

  const firestore = getFirestoreInstance();
  if (!firestore) {
    console.log('❌ Firestore not initialized');
    return null;
  }
  console.log('✅ Firestore initialized');

  const dataRef = doc(firestore, `users/${user.uid}/time-record-data/${date}`);
  console.log('📄 Fetching document from path:', `users/${user.uid}/time-record-data/${date}`);
  const snapshot = await getDoc(dataRef);

  if (!snapshot.exists()) {
    console.log('ℹ️ No time record data found in Firestore for:', date);
    return null;
  }

  const data = snapshot.data();
  console.log('📥 Raw data from Firestore:', data);
  const result = {
    date: data.date,
    blocks: data.blocks || [],
    categories: data.categories || [],
  } as TimePlannerData;
  console.log('📥 Retrieved time record data from Firestore:', result.date, 'blocks:', result.blocks.length, 'blocks array:', result.blocks);
  return result;
}

/**
 * 모든 시간 기록 데이터 불러오기
 */
export async function getAllTimeRecordData(): Promise<TimePlannerData[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const dataRef = collection(firestore, `users/${user.uid}/time-record-data`);
  const snapshot = await getDocs(dataRef);

  return snapshot.docs.map(doc => ({
    date: doc.id,
    blocks: doc.data().blocks || [],
    categories: doc.data().categories || [],
  } as TimePlannerData));
}

/**
 * 시간 기록 카테고리 저장 (전역 설정)
 */
export async function saveTimeRecordCategories(categories: TimePlannerCategory[]): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoriesRef = doc(firestore, `users/${user.uid}/time-record-categories/default`);
  await setDoc(categoriesRef, {
    categories,
    updatedAt: Timestamp.now(),
  });
}

/**
 * 시간 기록 카테고리 불러오기
 */
export async function getTimeRecordCategories(): Promise<TimePlannerCategory[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const categoriesRef = doc(firestore, `users/${user.uid}/time-record-categories/default`);
  const snapshot = await getDoc(categoriesRef);

  if (!snapshot.exists()) {
    return [];
  }

  return snapshot.data().categories || [];
}

