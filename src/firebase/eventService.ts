/**
 * 이벤트 및 이벤트 카테고리 Firestore 서비스
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
import { Event, EventCategory } from '../types';

/**
 * 이벤트 저장
 */
export async function saveEvent(event: Event): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const eventRef = doc(firestore, `users/${user.uid}/events/${event.id}`);
  await setDoc(eventRef, {
    ...event,
    createdAt: Timestamp.fromMillis(event.createdAt),
    updatedAt: Timestamp.now(),
  });
}

/**
 * 이벤트 불러오기 (단일)
 */
export async function getEvent(eventId: string): Promise<Event | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return null;
  }

  const eventRef = doc(firestore, `users/${user.uid}/events/${eventId}`);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    ...data,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    updatedAt: (data.updatedAt as Timestamp).toMillis(),
  } as Event;
}

/**
 * 모든 이벤트 불러오기
 */
export async function getAllEvents(): Promise<Event[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const eventsRef = collection(firestore, `users/${user.uid}/events`);
  const q = query(eventsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Event;
  });
}

/**
 * 날짜별 이벤트 불러오기
 */
export async function getEventsByDate(date: string): Promise<Event[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const eventsRef = collection(firestore, `users/${user.uid}/events`);
  const q = query(eventsRef, where('date', '==', date), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp).toMillis(),
    } as Event;
  });
}

/**
 * 이벤트 삭제
 */
export async function deleteEvent(eventId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const eventRef = doc(firestore, `users/${user.uid}/events/${eventId}`);
  await deleteDoc(eventRef);
}

/**
 * 여러 이벤트 일괄 저장
 */
export async function saveEventsBatch(events: Event[]): Promise<void> {
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
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (event) => {
        const eventRef = doc(firestore, `users/${user.uid}/events/${event.id}`);
        await setDoc(eventRef, {
          ...event,
          createdAt: Timestamp.fromMillis(event.createdAt),
          updatedAt: Timestamp.now(),
        });
      })
    );
  }
}

/**
 * 이벤트 카테고리 저장
 */
export async function saveEventCategory(category: EventCategory): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoryRef = doc(firestore, `users/${user.uid}/event-categories/${category.id}`);
  await setDoc(categoryRef, {
    ...category,
    createdAt: Timestamp.fromMillis(category.createdAt),
    updatedAt: Timestamp.now(),
  });
}

/**
 * 모든 이벤트 카테고리 불러오기
 */
export async function getAllEventCategories(): Promise<EventCategory[]> {
  const user = getCurrentUser();
  if (!user) {
    return [];
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    return [];
  }

  const categoriesRef = collection(firestore, `users/${user.uid}/event-categories`);
  const q = query(categoriesRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: (data.createdAt as Timestamp).toMillis(),
    } as EventCategory;
  });
}

/**
 * 이벤트 카테고리 삭제
 */
export async function deleteEventCategory(categoryId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoryRef = doc(firestore, `users/${user.uid}/event-categories/${categoryId}`);
  await deleteDoc(categoryRef);
}

/**
 * 여러 이벤트 카테고리 일괄 저장
 */
export async function saveEventCategoriesBatch(categories: EventCategory[]): Promise<void> {
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
  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (category) => {
        const categoryRef = doc(firestore, `users/${user.uid}/event-categories/${category.id}`);
        await setDoc(categoryRef, {
          ...category,
          createdAt: Timestamp.fromMillis(category.createdAt),
          updatedAt: Timestamp.now(),
        });
      })
    );
  }
}

