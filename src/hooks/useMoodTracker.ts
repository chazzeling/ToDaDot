import { useState, useEffect } from 'react';
import { MoodEntry } from '../types';

const STORAGE_KEY = 'mood-tracker';

export function useMoodTracker() {
  const [moods, setMoods] = useState<MoodEntry[]>([]);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMoods(parsed);
      } catch (error) {
        console.error('Failed to load moods:', error);
      }
    }
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moods));
  }, [moods]);

  const getMoodForDate = (date: string) => {
    return moods.find((mood) => mood.date === date);
  };

  const setMoodForDate = (date: string, color: string) => {
    setMoods((prev) => {
      const existing = prev.find((m) => m.date === date);
      if (existing) {
        return prev.map((m) => (m.date === date ? { ...m, color } : m));
      } else {
        return [...prev, { date, color }];
      }
    });
  };

  const removeMoodForDate = (date: string) => {
    setMoods((prev) => prev.filter((m) => m.date !== date));
  };

  return {
    moods,
    getMoodForDate,
    setMoodForDate,
    removeMoodForDate,
  };
}












