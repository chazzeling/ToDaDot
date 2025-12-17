/**
 * 카테고리 Firestore 서비스
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
import { Category } from '../types';

/**
 * 카테고리 저장
 */
export async function saveCategory(category: Category): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoryRef = doc(firestore, `users/${user.uid}/categories/${category.id}`);
  await setDoc(categoryRef, {
    ...category,
    createdAt: Timestamp.fromMillis(category.createdAt),
    updatedAt: Timestamp.now(),
  });
}

/**
 * 모든 카테고리 불러오기
 */
export async function getAllCategories(): Promise<Category[]> {
  console.log('🔵 getAllCategories 호출됨');
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ getAllCategories: 사용자 없음');
    return [];
  }

  console.log(`🔵 getAllCategories: 사용자 UID = ${user.uid}`);
  const firestore = getFirestoreInstance();
  if (!firestore) {
    console.log('❌ getAllCategories: Firestore 초기화 안 됨');
    return [];
  }

  const categoriesRef = collection(firestore, `users/${user.uid}/categories`);
  console.log(`🔵 getAllCategories: Firestore 경로 = users/${user.uid}/categories`);
  
  try {
    // order 필드가 없는 경우를 대비해 먼저 모든 문서를 가져온 후 정렬
    const snapshot = await getDocs(categoriesRef);
    console.log(`🔵 getAllCategories: Firestore에서 ${snapshot.docs.length}개 문서 가져옴`);

    const categories = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: (data.createdAt as Timestamp).toMillis(),
        order: data.order ?? 0, // order가 없으면 0으로 설정
      } as Category;
    });
    
    // order로 정렬
    categories.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    console.log(`🔵 getAllCategories: ${categories.length}개 카테고리 반환`);
    
    return categories;
  } catch (error) {
    console.error('❌ getAllCategories 에러:', error);
    throw error;
  }
}

/**
 * 카테고리 삭제
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const categoryRef = doc(firestore, `users/${user.uid}/categories/${categoryId}`);
  await deleteDoc(categoryRef);
}

/**
 * 여러 카테고리 일괄 저장
 */
export async function saveCategoriesBatch(categories: Category[]): Promise<void> {
  console.log(`🔵 saveCategoriesBatch 호출됨: ${categories.length}개 카테고리`);
  const user = getCurrentUser();
  if (!user) {
    console.log('❌ saveCategoriesBatch: 사용자 없음');
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    console.log('❌ saveCategoriesBatch: Firestore 초기화 안 됨');
    throw new Error('Firestore not initialized');
  }

  console.log(`🔵 saveCategoriesBatch: 사용자 UID = ${user.uid}`);
  // Firestore는 한 번에 500개까지만 batch 작업 가능
  const batchSize = 500;
  for (let i = 0; i < categories.length; i += batchSize) {
    const batch = categories.slice(i, i + batchSize);
    console.log(`🔵 saveCategoriesBatch: 배치 ${i / batchSize + 1} 저장 중 (${batch.length}개)`);
    await Promise.all(
      batch.map(async (category) => {
        const categoryRef = doc(firestore, `users/${user.uid}/categories/${category.id}`);
        await setDoc(categoryRef, {
          ...category,
          createdAt: Timestamp.fromMillis(category.createdAt),
          updatedAt: Timestamp.now(),
        });
        console.log(`✅ 카테고리 저장됨: ${category.name} (${category.id})`);
      })
    );
  }
  console.log(`✅ saveCategoriesBatch 완료: ${categories.length}개 카테고리 저장됨`);
}

