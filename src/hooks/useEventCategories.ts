import { useState, useEffect, useRef } from 'react';
import { EventCategory } from '../types';
import { useFirebaseAuth } from './useFirebaseAuth';
import * as eventService from '../firebase/eventService';

const STORAGE_KEY = 'event-categories';
const EVENTS_STORAGE_KEY = 'events';

export function useEventCategories() {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const isInitialLoadRef = useRef(true);
  const hasSyncedRef = useRef(false);

  // 로컬 스토리지와 Firebase에서 불러오기
  useEffect(() => {
    const loadData = async () => {
      // 1. localStorage에서 불러오기
      const saved = localStorage.getItem(STORAGE_KEY);
      let localCategories: EventCategory[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localCategories = parsed;
        } catch (error) {
          console.error('Failed to load event categories from localStorage:', error);
        }
      }

      // 2. Firebase에서 불러오기 (인증된 경우)
      if (isAuthenticated && user && !hasSyncedRef.current) {
        try {
          const firebaseCategories = await eventService.getAllEventCategories();
          
          if (firebaseCategories.length > 0) {
            // Firebase 데이터와 로컬 데이터 병합 (로컬 데이터 우선)
            const mergedCategories = mergeCategories(localCategories, firebaseCategories);
            setCategories(mergedCategories);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedCategories));
          } else if (localCategories.length > 0) {
            // Firebase에 데이터가 없고 로컬에만 있으면 Firebase에 저장
            setCategories(localCategories);
            await eventService.saveEventCategoriesBatch(localCategories);
          } else {
            setCategories(localCategories);
          }
          
          hasSyncedRef.current = true;
        } catch (error) {
          console.error('Failed to load event categories from Firebase:', error);
          setCategories(localCategories);
        }
      } else {
        setCategories(localCategories);
      }
      
      isInitialLoadRef.current = false;
    };
    
    loadData();
  }, [isAuthenticated, user]);

  // 병합 함수: 로컬 데이터 우선
  const mergeCategories = (local: EventCategory[], firebase: EventCategory[]): EventCategory[] => {
    const mergedMap = new Map<string, EventCategory>();
    
    // Firebase 데이터 먼저 추가
    firebase.forEach(cat => mergedMap.set(cat.id, cat));
    
    // 로컬 데이터로 덮어쓰기 (같은 ID가 있으면 로컬 데이터 우선)
    local.forEach(cat => mergedMap.set(cat.id, cat));
    
    return Array.from(mergedMap.values());
  };

  // 로컬 스토리지와 Firebase에 저장
  useEffect(() => {
    if (isInitialLoadRef.current) {
      return;
    }
    
    // localStorage에 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    
    // Firebase에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      // 각 카테고리를 개별적으로 저장
      categories.forEach(category => {
        eventService.saveEventCategory(category).catch(error => {
          console.error('Failed to save event category to Firebase:', error);
        });
      });
    }
  }, [categories, isAuthenticated, user]);

  const createCategory = (name: string, color: string) => {
    const newCategory: EventCategory = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      color,
      createdAt: Date.now(),
    };

    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (id: string, name: string, color: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name, color } : cat))
    );
    
    // 해당 분류의 모든 일정 색상도 함께 업데이트
    try {
      const savedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (savedEvents) {
        const events = JSON.parse(savedEvents);
        const updatedEvents = events.map((event: any) => {
          if (event.categoryId === id) {
            return { ...event, color };
          }
          return event;
        });
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(updatedEvents));
        
        // 이벤트를 발생시켜 useEvents hook이 업데이트되도록 함
        window.dispatchEvent(new CustomEvent('eventCategoryUpdated', { 
          detail: { categoryId: id, color } 
        }));
      }
    } catch (error) {
      console.error('Failed to update event colors:', error);
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
    
    // Firebase에서도 삭제 (인증된 경우)
    if (isAuthenticated && user) {
      eventService.deleteEventCategory(id).catch(error => {
        console.error('Failed to delete event category from Firebase:', error);
      });
    }
  };

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}






