import { useState, useEffect, useRef } from 'react';
import { Quadrant } from '../types';
import { useFirebaseAuth } from './useFirebaseAuth';
import * as settingsService from '../firebase/settingsService';

const STORAGE_KEY = 'quadrant-colors';
const STORAGE_KEY_PRESET = 'quadrant-color-preset';

export type ColorPreset = 'spring' | 'summer' | 'autumn' | 'winter';

export const COLOR_PRESETS: Record<ColorPreset, Record<Quadrant, string>> = {
  spring: {
    'urgent-important': '#ff7878ff',
    'not-urgent-important': '#82e043ff',
    'urgent-not-important': 'rgba(255, 213, 121, 1)',
    'not-urgent-not-important': 'hsla(202, 88%, 90%, 1.00)',
    'uncategorized': '#999',
  },
  summer: {
    'urgent-important': '#ffc2e1ff',
    'not-urgent-important': '#bcf5ddff',
    'urgent-not-important': '#b3daffff',
    'not-urgent-not-important': '#cbcbd4ff',
    'uncategorized': '#bdbdbdff',
  },
  autumn: {
    'urgent-important': '#b84b3dff',
    'not-urgent-important': '#72921bff',
    'urgent-not-important': '#ce8644ff',
    'not-urgent-not-important': '#335f2eff',
    'uncategorized': '#999',
  },
  winter: {
    'urgent-important': '#e1b2f0ff',
    'not-urgent-important': '#7EC8E3',
    'urgent-not-important': '#A8DADC',
    'not-urgent-not-important': '#d4dddfff',
    'uncategorized': '#949a9cff',
  },
};

export function useQuadrantColors() {
  const { user, isAuthenticated } = useFirebaseAuth();
  const [preset, setPreset] = useState<ColorPreset>('spring');
  const [colors, setColors] = useState<Record<Quadrant, string>>(COLOR_PRESETS.spring);
  const hasSyncedRef = useRef(false);

  // 로컬 스토리지와 Firebase에서 불러오기
  useEffect(() => {
    const loadData = async () => {
      // 1. localStorage에서 불러오기
      const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET);
      const savedColors = localStorage.getItem(STORAGE_KEY);
      
      let localPreset: ColorPreset = 'spring';
      let localColors: Record<Quadrant, string> = COLOR_PRESETS.spring;
      
      if (savedPreset) {
        try {
          const parsedPreset = savedPreset as ColorPreset;
          // 기존 프리셋 이름을 새 이름으로 마이그레이션
          let presetKey: ColorPreset = parsedPreset;
          if (parsedPreset === 'default') presetKey = 'spring';
          else if (parsedPreset === 'calm') presetKey = 'summer';
          else if (parsedPreset === 'deep') presetKey = 'autumn';
          
          if (COLOR_PRESETS[presetKey]) {
            localPreset = presetKey;
            localColors = COLOR_PRESETS[presetKey];
            // 마이그레이션된 경우 저장
            if (presetKey !== parsedPreset) {
              localStorage.setItem(STORAGE_KEY_PRESET, presetKey);
            }
          }
        } catch (error) {
          console.error('Failed to load quadrant color preset:', error);
        }
      }
      
      if (savedColors) {
        try {
          const parsed = JSON.parse(savedColors);
          localColors = { ...localColors, ...parsed };
        } catch (error) {
          console.error('Failed to load quadrant colors:', error);
        }
      }

      // 2. Firebase에서 불러오기 (인증된 경우)
      if (isAuthenticated && user && !hasSyncedRef.current) {
        try {
          const firebaseData = await settingsService.getQuadrantColors();
          
          if (firebaseData) {
            // Firebase 데이터가 있으면 우선 사용
            setPreset(firebaseData.preset as ColorPreset);
            setColors(firebaseData.colors as Record<Quadrant, string>);
            localStorage.setItem(STORAGE_KEY_PRESET, firebaseData.preset);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(firebaseData.colors));
          } else {
            // Firebase에 데이터가 없고 로컬에만 있으면 Firebase에 저장
            setPreset(localPreset);
            setColors(localColors);
            await settingsService.saveQuadrantColors(localColors, localPreset);
          }
          
          hasSyncedRef.current = true;
        } catch (error) {
          console.error('Failed to load quadrant colors from Firebase:', error);
          setPreset(localPreset);
          setColors(localColors);
        }
      } else {
        setPreset(localPreset);
        setColors(localColors);
      }
    };
    
    loadData();
  }, [isAuthenticated, user]);

  // 로컬 스토리지와 Firebase에 저장
  useEffect(() => {
    if (hasSyncedRef.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
      
      // Firebase에 저장 (인증된 경우)
      if (isAuthenticated && user) {
        settingsService.saveQuadrantColors(colors, preset).catch(error => {
          console.error('Failed to save quadrant colors to Firebase:', error);
        });
      }
    }
  }, [colors, preset, isAuthenticated, user]);

  useEffect(() => {
    if (hasSyncedRef.current) {
      localStorage.setItem(STORAGE_KEY_PRESET, preset);
    }
  }, [preset]);

  const updatePreset = (newPreset: ColorPreset) => {
    setPreset(newPreset);
    setColors(COLOR_PRESETS[newPreset]);
  };

  return {
    colors,
    preset,
    updatePreset,
  };
}
