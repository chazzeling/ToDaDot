import { useState, useEffect } from 'react';
import { Category } from '../types';

const STORAGE_KEY = 'categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
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
        setCategories(categoriesWithOrder);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    }
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  }, [categories]);

  const createCategory = (name: string, color: string) => {
    const newCategory: Category = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name,
      color,
      createdAt: Date.now(),
      order: categories.length, // 새 카테고리는 끝에 추가
    };

    setCategories((prev) => [...prev, newCategory]);
  };

  const updateCategory = (id: string, name: string, color: string) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name, color } : cat))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => {
      const filtered = prev.filter((cat) => cat.id !== id);
      // 삭제 후 order 재정렬
      return filtered.map((cat, index) => ({ ...cat, order: index }));
    });
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