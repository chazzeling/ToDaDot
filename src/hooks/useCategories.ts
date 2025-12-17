import { useState, useEffect, useRef } from 'react';
import { Category } from '../types';
import { useFirebaseAuth } from './useFirebaseAuth';
import * as categoryService from '../firebase/categoryService';

const STORAGE_KEY = 'categories';
const FIREBASE_SYNC_COMPLETED_KEY = 'firebase-categories-sync-completed';

export function useCategories() {
  console.log('🔵 useCategories hook 실행됨');
  const { user, isAuthenticated } = useFirebaseAuth();
  console.log('🔵 useCategories 인증 상태:', { isAuthenticated, hasUser: !!user, userId: user?.uid });
  const [categories, setCategories] = useState<Category[]>([]);
  const isInitialLoadRef = useRef(true);
  const hasSyncedRef = useRef(false);

  // 로컬 스토리지와 Firebase에서 불러오기
  useEffect(() => {
    const loadData = async () => {
      console.log('📦 useCategories: 데이터 로드 시작', {
        isAuthenticated,
        hasUser: !!user,
        hasSynced: hasSyncedRef.current,
        isInitialLoad: isInitialLoadRef.current
      });
      
      // 인증 상태가 변경되면 동기화 플래그 리셋
      if (!isAuthenticated || !user) {
        console.log('🔓 인증되지 않음, 동기화 플래그 리셋');
        hasSyncedRef.current = false;
      }
      
      // 1. localStorage에서 불러오기
      const saved = localStorage.getItem(STORAGE_KEY);
      let localCategories: Category[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // order 필드가 없는 경우 추가 (기존 데이터 호환성)
          const categoriesWithOrder = parsed.map((cat: Category, index: number) => ({
            ...cat,
            order: cat.order !== undefined ? cat.order : index,
          }));
          // order로 정렬
          categoriesWithOrder.sort((a: Category, b: Category) => (a.order ?? 0) - (b.order ?? 0));
          localCategories = categoriesWithOrder;
          console.log(`📁 로컬 카테고리 로드: ${localCategories.length}개`);
        } catch (error) {
          console.error('Failed to load categories from localStorage:', error);
        }
      } else {
        console.log('📁 로컬 카테고리 없음');
      }

      // 2. Firebase에서 불러오기 (인증된 경우)
      if (isAuthenticated && user) {
        if (hasSyncedRef.current) {
          console.log('⏭️ 이미 동기화 완료, Firebase 동기화 건너뜀');
          setCategories(localCategories);
        } else {
          try {
            console.log('🔄 카테고리 Firebase 동기화 시작...');
            console.log(`   사용자 UID: ${user.uid}`);
            const firebaseCategories = await categoryService.getAllCategories();
            console.log(`   Firebase 카테고리 수: ${firebaseCategories.length}, 로컬 카테고리 수: ${localCategories.length}`);
            
            if (firebaseCategories.length > 0) {
              // Firebase 데이터와 로컬 데이터 병합 (로컬 데이터 우선)
              const mergedCategories = mergeCategories(localCategories, firebaseCategories);
              console.log(`   병합된 카테고리 수: ${mergedCategories.length}`);
              setCategories(mergedCategories);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedCategories));
              
              // 병합된 데이터를 Firebase에 저장 (로컬 데이터가 우선이므로)
              if (mergedCategories.length > 0) {
                console.log('💾 병합된 카테고리를 Firebase에 저장 중...');
                await categoryService.saveCategoriesBatch(mergedCategories);
                console.log('✅ Firebase 저장 완료');
              }
            } else if (localCategories.length > 0) {
              // Firebase에 데이터가 없고 로컬에만 있으면 Firebase에 저장
              console.log(`💾 로컬 카테고리 ${localCategories.length}개를 Firebase에 저장 중...`);
              setCategories(localCategories);
              await categoryService.saveCategoriesBatch(localCategories);
              console.log('✅ Firebase 저장 완료');
            } else {
              console.log('📭 Firebase와 로컬 모두 카테고리 없음');
              setCategories(localCategories);
            }
            
            hasSyncedRef.current = true;
            localStorage.setItem(FIREBASE_SYNC_COMPLETED_KEY, 'true');
            console.log('✅ 카테고리 Firebase 동기화 완료');
          } catch (error) {
            console.error('❌ Failed to load categories from Firebase:', error);
            console.error('   에러 상세:', error);
            setCategories(localCategories);
          }
        }
      } else {
        console.log('🔓 인증되지 않음, 로컬 데이터만 사용');
        setCategories(localCategories);
      }
      
      isInitialLoadRef.current = false;
    };
    
    loadData();
  }, [isAuthenticated, user]);

  // 병합 함수: 로컬 데이터 우선
  const mergeCategories = (local: Category[], firebase: Category[]): Category[] => {
    const mergedMap = new Map<string, Category>();
    
    // Firebase 데이터 먼저 추가
    firebase.forEach(cat => mergedMap.set(cat.id, cat));
    
    // 로컬 데이터로 덮어쓰기 (같은 ID가 있으면 로컬 데이터 우선)
    local.forEach(cat => mergedMap.set(cat.id, cat));
    
    const merged = Array.from(mergedMap.values());
    merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return merged;
  };

  // 로컬 스토리지와 Firebase에 저장
  useEffect(() => {
    if (isInitialLoadRef.current) {
      console.log('⏸️ 초기 로딩 중, 저장 건너뜀');
      return;
    }
    
    console.log(`💾 카테고리 저장 시작: ${categories.length}개`, {
      isAuthenticated,
      hasUser: !!user,
      hasSynced: hasSyncedRef.current
    });
    
    // localStorage에 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    console.log('✅ localStorage 저장 완료');
    
    // Firebase에 저장 (인증된 경우, 동기화가 완료된 후에만)
    if (isAuthenticated && user && hasSyncedRef.current) {
      console.log('💾 Firebase에 카테고리 저장 중...');
      // 일괄 저장으로 변경 (더 효율적)
      categoryService.saveCategoriesBatch(categories)
        .then(() => {
          console.log('✅ Firebase 저장 완료');
        })
        .catch(error => {
          console.error('❌ Failed to save categories to Firebase:', error);
          console.error('   에러 상세:', error);
        });
    } else {
      if (!isAuthenticated || !user) {
        console.log('🔓 인증되지 않음, Firebase 저장 건너뜀');
      } else if (!hasSyncedRef.current) {
        console.log('⏳ 아직 동기화 안 됨, Firebase 저장 건너뜀');
      }
    }
  }, [categories, isAuthenticated, user]);

  const createCategory = (name: string, color: string) => {
    const newCategory: Category = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      color,
      createdAt: Date.now(),
      order: categories.length, // 새 카테고리는 끝에 추가
    };

    console.log('➕ 새 카테고리 생성:', newCategory);
    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (id: string, name: string, color: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name, color } : cat))
    );
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => {
      const filtered = prev.filter((cat) => cat.id !== id);
      // 삭제 후 order 재정렬
      return filtered.map((cat, index) => ({ ...cat, order: index }));
    });
    
    // Firebase에서도 삭제 (인증된 경우)
    if (isAuthenticated && user) {
      categoryService.deleteCategory(id).catch(error => {
        console.error('Failed to delete category from Firebase:', error);
      });
    }
  };

  const reorderCategories = (draggedId: string, targetId: string) => {
    setCategories((prev) => {
      const sorted = [...prev].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const draggedIndex = sorted.findIndex((cat) => cat.id === draggedId);
      const targetIndex = sorted.findIndex((cat) => cat.id === targetId);

      if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
        return prev;
      }

      const reordered = [...sorted];
      const [dragged] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, dragged);

      // order 재할당
      return reordered.map((cat, index) => ({ ...cat, order: index }));
    });
  };

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
  };
}