import { useState, useEffect, useRef } from 'react';
import { MoodEntry, DateString } from '../types';
import { useFirebaseAuth } from './useFirebaseAuth';
import * as moodService from '../firebase/moodService';

const STORAGE_KEY = 'mood-tracker';

export function useMoodTracker() {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const hasSyncedRef = useRef(false);

  // 로컬 스토리지와 Firebase에서 불러오기
  useEffect(() => {
    // 인증 상태가 변경되면 동기화 플래그 리셋
    if (!isAuthenticated || !user) {
      hasSyncedRef.current = false;
      return;
    }
    
    const loadData = async () => {
      // 1. localStorage에서 불러오기
      let localMoods: MoodEntry[] = [];
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          localMoods = JSON.parse(saved);
        } catch (error) {
          console.error('Failed to load moods from localStorage:', error);
        }
      }

      // 2. Firebase에서 불러오기 (인증된 경우)
      if (isAuthenticated && user && !hasSyncedRef.current) {
        try {
          const firebaseMoods = await moodService.getAllMoods();
          
          if (firebaseMoods.length > 0) {
            // Firebase 데이터와 로컬 데이터 병합 (로컬 데이터 우선)
            const mergedMoods = mergeMoods(localMoods, firebaseMoods);
            setMoods(mergedMoods);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedMoods));
          } else if (localMoods.length > 0) {
            // Firebase에 데이터가 없고 로컬에만 있으면 Firebase에 저장
            setMoods(localMoods);
            await moodService.saveMoodsBatch(localMoods.map(m => ({ date: m.date as DateString, color: m.color })));
          } else {
            setMoods(localMoods);
          }
          
          hasSyncedRef.current = true;
        } catch (error) {
          console.error('Failed to load moods from Firebase:', error);
          setMoods(localMoods);
        }
      } else if (!hasSyncedRef.current) {
        setMoods(localMoods);
      }
    };
    
    loadData();
  }, [isAuthenticated, user]);

  // 병합 함수: 로컬 데이터 우선
  const mergeMoods = (local: MoodEntry[], firebase: { date: DateString; color: string }[]): MoodEntry[] => {
    const mergedMap = new Map<string, MoodEntry>();
    
    // Firebase 데이터 먼저 추가
    firebase.forEach(mood => mergedMap.set(mood.date, { date: mood.date, color: mood.color }));
    
    // 로컬 데이터로 덮어쓰기 (같은 날짜가 있으면 로컬 데이터 우선)
    local.forEach(mood => mergedMap.set(mood.date, mood));
    
    return Array.from(mergedMap.values());
  };

  // 로컬 스토리지와 Firebase에 저장
  useEffect(() => {
    // localStorage에 저장 (항상)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moods));
    
    // Firebase에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      // 각 무드를 개별적으로 저장
      moods.forEach(mood => {
        moodService.saveMood({ date: mood.date as DateString, color: mood.color }).catch(error => {
          console.error('Failed to save mood to Firebase:', error);
        });
      });
    }
  }, [moods, isAuthenticated, user]);

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

  const removeMoodForDate = async (date: string) => {
    setMoods((prev) => prev.filter((m) => m.date !== date));
    
    // Firebase에서도 삭제 (인증된 경우)
    if (isAuthenticated && user) {
      moodService.deleteMood(date as DateString).catch(error => {
        console.error('Failed to delete mood from Firebase:', error);
      });
    }
  };

  return {
    moods,
    getMoodForDate,
    setMoodForDate,
    removeMoodForDate,
  };
}












