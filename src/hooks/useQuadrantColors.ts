import { useState, useEffect } from 'react';
import { Quadrant } from '../types';

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
  const [preset, setPreset] = useState<ColorPreset>('spring');
  const [colors, setColors] = useState<Record<Quadrant, string>>(COLOR_PRESETS.spring);

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    const savedPreset = localStorage.getItem(STORAGE_KEY_PRESET);
    const savedColors = localStorage.getItem(STORAGE_KEY);
    
    if (savedPreset) {
      try {
        const parsedPreset = savedPreset as ColorPreset;
        // 기존 프리셋 이름을 새 이름으로 마이그레이션
        let presetKey: ColorPreset = parsedPreset;
        if (parsedPreset === 'default') presetKey = 'spring';
        else if (parsedPreset === 'calm') presetKey = 'summer';
        else if (parsedPreset === 'deep') presetKey = 'autumn';
        
        if (COLOR_PRESETS[presetKey]) {
          setPreset(presetKey);
          setColors(COLOR_PRESETS[presetKey]);
          // 마이그레이션된 경우 저장
          if (presetKey !== parsedPreset) {
            localStorage.setItem(STORAGE_KEY_PRESET, presetKey);
          }
        } else {
          // 유효하지 않은 프리셋인 경우 기본값 사용
          setPreset('spring');
          setColors(COLOR_PRESETS.spring);
          localStorage.setItem(STORAGE_KEY_PRESET, 'spring');
        }
      } catch (error) {
        console.error('Failed to load quadrant color preset:', error);
        // 에러 발생 시 기본값 사용
        setPreset('spring');
        setColors(COLOR_PRESETS.spring);
        localStorage.setItem(STORAGE_KEY_PRESET, 'spring');
      }
    }
    
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        setColors((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to load quadrant colors:', error);
      }
    }
  }, []);

  // 로컬 스토리지에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
  }, [colors]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PRESET, preset);
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
