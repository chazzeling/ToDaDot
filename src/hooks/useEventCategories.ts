import { useState, useEffect } from 'react';
import { EventCategory } from '../types';

const STORAGE_KEY = 'event-categories';
const EVENTS_STORAGE_KEY = 'events';

export function useEventCategories() {
  const [categories, setCategories] = useState<EventCategory[]>([]);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCategories(parsed);
      } catch (error) {
        console.error('Failed to load event categories:', error);
      }
    }
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

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

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  return {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}






