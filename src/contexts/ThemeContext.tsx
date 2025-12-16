import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeColors } from '../types';
import { isLight } from '../utils/colorUtils';

interface ThemeContextType {
  currentTheme: Theme;
  allThemes: Theme[];
  selectTheme: (themeId: string) => void;
  createCustomTheme: (theme: Theme) => void;
  updateCustomTheme: (themeId: string, updates: { name: string; colors: ThemeColors }) => void;
  deleteCustomTheme: (themeId: string) => void;
  previewTheme: (colors: ThemeColors) => void;
  resetPreview: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app-themes';
const CURRENT_THEME_KEY = 'app-current-theme';

// 프리셋 테마 ID 목록 (테마 필터링에 사용)
export const PRESET_THEME_IDS = ['brunia', 'cyclamen', 'forsythia', 'hydrangea', 'chickweed', 'lantana'];

// 프리셋 테마
const PRESET_THEMES: Theme[] = [
  {
    id: 'brunia',
    name: '브루니아',
    colors: {
      primary: '#f8f9fa',
      secondary: '#a7a7a7ff',
      accent: '#5f5f5fff',
      background: '#f8f9fa', // 배경색: 밝은 회색
      surface: '#ffffff', // 표면색: 흰색 (배경보다 밝음)
      text: '#000000',
      textSecondary: '#666666',
      border: '#e9ecef',
      danger: '#e68d95f6',
      dangerLight: '#f8d7da',
    },
  },
  {
    id: 'cyclamen',
    name: '시클라멘',
    colors: {
      primary: '#fff7f8ff',
      secondary: '#ffd2daff',
      accent: '#ff8d8dff',
      background: '#FFF8F5',
      surface: '#FFFFFF',
      text: '#8d1845ff',
      textSecondary: '#b499a2ff',
      border: '#fff0eaff',
      danger: '#FF6B6B',
      dangerLight: '#FFE5E5',
    },
  },
  {
    id: 'forsythia',
    name: '개나리',
    colors: {
      primary: '#fffce3ff',
      secondary: '#ffe59cff',
      accent: '#ffd561ff',
      background: '#fffefcff',
      surface: '#fffff6ff',
      text: '#995700ff',
      textSecondary: '#c4b78eff',
      border: '#fff7dfff',
      danger: '#ffaa0cff',
      dangerLight: '#ffc23fff',
    },
  },
  {
    id: 'hydrangea',
    name: '수국',
    colors: {
      primary: '#96c8f7ff',
      secondary: 'rgba(198, 204, 255, 1)',
      accent: '#aea6f3ff',
      background: '#f3f6ffff',
      surface: '#FFFFFF',
      text: '#00177eff',
      textSecondary: '#597ac0ff',
      border: '#e0e2f7ff',
      danger: '#0b22a3ff',
      dangerLight: '#536de4ff',
    },
  },
  {
    id: 'chickweed',
    name: '별꽃',
    colors: {
      primary: '#b7ffcdff',
      secondary: '#87d687ff',
      accent: '#70da87ff',
      background: '#F0FFF0',
      surface: '#fafffcff',
      text: '#1e5f05ff',
      textSecondary: '#94b494ff',
      border: '#E0F5E0',
      danger: '#0b5c41ff',
      dangerLight: '#598359ff',
    },
  },
  {
    id: 'lantana',
    name: '란타나: 접근성 높은 색상',
    colors: {
      primary: '#E8E8E8', // 밝은 회색 (주요 배경)
      secondary: '#88b9f0', // 파란색 (버튼, 강조 요소) - 색맹자도 구분 가능
      accent: '#F5A623', // 오렌지색 (강조) - 색맹자도 구분 가능
      background: '#FFFFFF', // 흰색 배경
      surface: '#F7F7F7', // 약간 어두운 회색 표면
      text: '#2C3E50', // 진한 회색 텍스트 (고대비)
      textSecondary: '#7F8C8D', // 중간 회색 보조 텍스트
      border: '#BDC3C7', // 회색 테두리
      danger: '#E74C3C', // 빨간색 (위험) - 색맹자도 구분 가능
      dangerLight: '#FADBD8', // 연한 빨간색
    },
  },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 기본 테마 (fallback용) - 항상 유효한 brunia 테마 사용
  const getDefaultTheme = (): Theme => {
    return PRESET_THEMES.find(t => t.id === 'brunia') || PRESET_THEMES[0];
  };

  const [allThemes, setAllThemes] = useState<Theme[]>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) {
        try {
          const customThemes = JSON.parse(saved);
          // 커스텀 테마에서 프리셋 테마 중복 제거
          const uniqueCustomThemes = customThemes.filter((t: Theme) => !PRESET_THEME_IDS.includes(t.id));
          return [...PRESET_THEMES, ...uniqueCustomThemes];
        } catch (parseError) {
          console.error('[ThemeContext] Failed to parse custom themes, using presets only:', parseError);
          // 파싱 실패 시 프리셋만 사용 (localStorage 제거하지 않음)
          return PRESET_THEMES;
        }
      }
      return PRESET_THEMES;
    } catch (error) {
      console.error('[ThemeContext] Error loading themes, using presets only:', error);
      return PRESET_THEMES;
    }
  });

  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_THEME_KEY);
      // 저장된 테마가 없거나 존재하지 않는 테마인 경우, brunia로 교체
      if (!saved || !PRESET_THEME_IDS.includes(saved)) {
        const defaultThemeId = 'brunia';
        // 기본 테마 ID를 localStorage에 저장 (다른 설정 데이터 보존)
        localStorage.setItem(CURRENT_THEME_KEY, defaultThemeId);
        console.log('[ThemeContext] Invalid theme ID replaced with brunia:', saved, '->', defaultThemeId);
        return defaultThemeId;
      }
      console.log('[ThemeContext] Loading saved theme:', saved);
      return saved;
    } catch (error) {
      console.error('[ThemeContext] Error loading theme ID, using brunia:', error);
      const defaultThemeId = 'brunia';
      localStorage.setItem(CURRENT_THEME_KEY, defaultThemeId);
      return defaultThemeId;
    }
  });

  // 현재 테마 찾기 (안전하게) - 옵셔널 체이닝 및 방어 로직 추가
  const currentTheme = (() => {
    try {
      if (!allThemes || !Array.isArray(allThemes)) {
        console.warn('[ThemeContext] allThemes is invalid, using default');
        return getDefaultTheme();
      }
      
      const found = allThemes.find((t) => t?.id === currentThemeId);
      if (found && found.colors && typeof found.colors === 'object') {
        // 색상 객체 검증
        const requiredColors = ['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'textSecondary', 'border', 'danger', 'dangerLight'];
        const hasAllColors = requiredColors.every(key => found.colors && found.colors[key as keyof typeof found.colors]);
        
        if (hasAllColors) {
          return found;
        } else {
          console.warn('[ThemeContext] Theme found but missing required colors, using default');
          return getDefaultTheme();
        }
      }
      console.warn('[ThemeContext] Current theme not found or invalid, using default');
      return getDefaultTheme();
    } catch (error) {
      console.error('[ThemeContext] Error finding current theme:', error);
      return getDefaultTheme();
    }
  })();

  // 테마 적용 - 새로운 색상 구조를 기존 CSS 변수에 매핑
  const applyTheme = (theme: Theme) => {
    if (!theme || !theme.colors) {
      console.error('[ThemeContext] Invalid theme provided to applyTheme, using default:', theme);
      // 유효하지 않은 테마면 기본 테마로 fallback
      const defaultTheme = getDefaultTheme();
      applyTheme(defaultTheme);
      return;
    }
    
    try {
      // 색상 값 검증 및 기본값 설정 (방어 로직)
      const colors = theme.colors || {};
      const defaultColor = '#f8f9fa';
      
      // 모든 색상 값에 옵셔널 체이닝 및 기본값 적용
      const primary = colors.primary || defaultColor;
      const secondary = colors.secondary || '#a7a7a7';
      const accent = colors.accent || '#5f5f5f';
      const background = colors.background || defaultColor;
      const surface = colors.surface || '#ffffff';
      const text = colors.text || '#000000';
      const textSecondary = colors.textSecondary || '#666666';
      const border = colors.border || '#e9ecef';
      const danger = colors.danger || '#e68d95';
      const dangerLight = colors.dangerLight || '#f8d7da';

      // 배경색과 표면색 명확히 구분
      document.documentElement.style.setProperty('--color-background', background);
      document.documentElement.style.setProperty('--color-surface', surface);
      
      // 기존 CSS 변수 구조 유지하면서 새로운 테마 색상 매핑
      document.documentElement.style.setProperty('--main-color', primary);
      document.documentElement.style.setProperty('--sub-color', secondary);
      document.documentElement.style.setProperty('--accent-color', accent);
      document.documentElement.style.setProperty('--background-color', surface); // 하위 호환성
      document.documentElement.style.setProperty('--line-color', border);
      document.documentElement.style.setProperty('--text-primary', text);
      document.documentElement.style.setProperty('--text-secondary', textSecondary);
      document.documentElement.style.setProperty('--bg-primary', background);
      document.documentElement.style.setProperty('--bg-secondary', surface);
      document.documentElement.style.setProperty('--border-color', border);
      document.documentElement.style.setProperty('--color-danger', danger);
      document.documentElement.style.setProperty('--color-danger-light', dangerLight);
      
      // sub-color의 밝기에 따라 텍스트 색상 자동 계산 (방어 로직)
      try {
        if (secondary && typeof isLight === 'function') {
          const subColorText = isLight(secondary) ? '#000000' : '#ffffff';
          document.documentElement.style.setProperty('--sub-color-text', subColorText);
        } else {
          document.documentElement.style.setProperty('--sub-color-text', '#000000');
        }
        
        // main-color의 밝기에 따라 텍스트 색상 자동 계산
        if (primary && typeof isLight === 'function') {
          const mainColorText = isLight(primary) ? '#000000' : '#ffffff';
          document.documentElement.style.setProperty('--main-color-text', mainColorText);
        } else {
          document.documentElement.style.setProperty('--main-color-text', '#000000');
        }
        
        // accent-color의 밝기에 따라 텍스트 색상 자동 계산
        if (accent && typeof isLight === 'function') {
          const accentColorText = isLight(accent) ? '#000000' : '#ffffff';
          document.documentElement.style.setProperty('--accent-color-text', accentColorText);
        } else {
          document.documentElement.style.setProperty('--accent-color-text', '#000000');
        }
      } catch (colorCalcError) {
        console.warn('[ThemeContext] Error calculating text colors, using defaults:', colorCalcError);
        document.documentElement.style.setProperty('--sub-color-text', '#000000');
        document.documentElement.style.setProperty('--main-color-text', '#000000');
        document.documentElement.style.setProperty('--accent-color-text', '#000000');
      }
      
      // body 배경색도 직접 설정 (혹시 모를 경우 대비)
      if (document.body) {
        document.body.style.backgroundColor = background;
        document.body.style.color = text;
      }
      
      console.log('[ThemeContext] Theme applied successfully. Background:', background, 'Surface:', surface);
    } catch (error) {
      console.error('[ThemeContext] Fatal error applying theme, falling back to default:', error);
      console.error('[ThemeContext] Error details:', error instanceof Error ? error.stack : String(error));
      // 크래시 방지: 기본 테마로 강제 적용
      try {
        const defaultTheme = getDefaultTheme();
        if (defaultTheme && defaultTheme.colors) {
          applyTheme(defaultTheme);
        } else {
          throw new Error('Default theme is also invalid');
        }
      } catch (fallbackError) {
        console.error('[ThemeContext] Even default theme failed, this is critical:', fallbackError);
        // 최후의 수단: 하드코딩된 기본 색상
        try {
          document.documentElement.style.setProperty('--bg-primary', '#f8f9fa');
          document.documentElement.style.setProperty('--text-primary', '#000000');
          if (document.body) {
            document.body.style.backgroundColor = '#f8f9fa';
            document.body.style.color = '#000000';
          }
        } catch (finalError) {
          console.error('[ThemeContext] Critical: Cannot set any styles:', finalError);
        }
      }
    }
  };

  // 현재 테마 적용 - 초기 마운트 및 테마 변경 시 (크래시 방지 예외 처리)
  useEffect(() => {
    try {
      // allThemes 검증 (방어 로직)
      if (!allThemes || !Array.isArray(allThemes)) {
        console.error('[ThemeContext] allThemes is invalid, using PRESET_THEMES');
        const defaultTheme = getDefaultTheme();
        applyTheme(defaultTheme);
        return;
      }

      // allThemes가 비어있을 수 있으므로 PRESET_THEMES를 기본으로 사용
      const availableThemes = allThemes.length > 0 ? allThemes : PRESET_THEMES;
      
      // currentThemeId 검증 (방어 로직)
      if (!currentThemeId || typeof currentThemeId !== 'string') {
        console.error('[ThemeContext] currentThemeId is invalid, using brunia');
        const defaultThemeId = 'brunia';
        localStorage.setItem(CURRENT_THEME_KEY, defaultThemeId);
        setCurrentThemeId(defaultThemeId);
        const defaultTheme = getDefaultTheme();
        applyTheme(defaultTheme);
        return;
      }
      
      // currentThemeId가 유효한지 확인 (옵셔널 체이닝 사용)
      const isValidThemeId = PRESET_THEME_IDS.includes(currentThemeId) || 
                            availableThemes.some(t => t?.id === currentThemeId);
      
      let themeToApply = availableThemes.find((t) => t?.id === currentThemeId);
      
      // 테마를 찾지 못했거나 ID가 유효하지 않은 경우 (방어 로직 강화)
      if (!themeToApply || !isValidThemeId || !themeToApply?.colors || typeof themeToApply.colors !== 'object') {
        console.warn('[ThemeContext] Invalid theme ID or theme data detected, using brunia:', currentThemeId);
        // localStorage를 지우지 않고, 테마 ID만 기본값으로 안전하게 교체 (다른 설정 데이터 보존)
        const defaultThemeId = 'brunia';
        localStorage.setItem(CURRENT_THEME_KEY, defaultThemeId);
        themeToApply = getDefaultTheme();
        
        // 상태 업데이트 (한 번만 실행되도록 조건 확인)
        if (currentThemeId !== defaultThemeId) {
          console.log('[ThemeContext] Updating currentThemeId to:', defaultThemeId);
          setCurrentThemeId(defaultThemeId);
        }
        
        // 테마 적용 (방어 로직)
        if (themeToApply?.colors && typeof themeToApply.colors === 'object') {
          console.log('[ThemeContext] Applying default brunia theme:', themeToApply?.id, themeToApply?.name);
          applyTheme(themeToApply);
        } else {
          // 최후의 수단
          console.error('[ThemeContext] Even default theme is invalid, using fallback');
          const fallbackTheme = PRESET_THEMES[0];
          if (fallbackTheme?.colors) {
            applyTheme(fallbackTheme);
          }
        }
        return;
      }
      
      // 유효한 테마 적용 (방어 로직 강화)
      if (themeToApply?.colors && typeof themeToApply.colors === 'object') {
        console.log('[ThemeContext] Applying theme:', themeToApply.id, themeToApply.name);
        applyTheme(themeToApply);
      } else {
        console.error('[ThemeContext] Theme found but colors are invalid, using brunia');
        const defaultTheme = getDefaultTheme();
        if (defaultTheme?.colors) {
          applyTheme(defaultTheme);
        }
        if (currentThemeId !== 'brunia') {
          setCurrentThemeId('brunia');
          localStorage.setItem(CURRENT_THEME_KEY, 'brunia');
        }
      }
    } catch (error) {
      console.error('[ThemeContext] Fatal error in theme loading useEffect:', error);
      // 크래시 방지: 기본 테마 강제 적용
      try {
        const defaultTheme = getDefaultTheme();
        applyTheme(defaultTheme);
        if (currentThemeId !== 'brunia') {
          setCurrentThemeId('brunia');
          localStorage.setItem(CURRENT_THEME_KEY, 'brunia');
        }
      } catch (fallbackError) {
        console.error('[ThemeContext] Critical: Even fallback failed:', fallbackError);
        // 최후의 수단: 하드코딩된 색상
        document.documentElement.style.setProperty('--bg-primary', '#f8f9fa');
        document.documentElement.style.setProperty('--text-primary', '#000000');
        if (document.body) {
          document.body.style.backgroundColor = '#f8f9fa';
          document.body.style.color = '#000000';
        }
      }
    }
  }, [currentThemeId, allThemes]);

  // 커스텀 테마 저장
  useEffect(() => {
    // 프리셋 테마가 아닌 커스텀 테마만 필터링하고 중복 제거
    const customThemes = allThemes.filter((t) => !PRESET_THEME_IDS.includes(t.id));
    // ID 기준으로 중복 제거
    const uniqueCustomThemes = customThemes.filter((theme, index, self) =>
      index === self.findIndex((t) => t.id === theme.id)
    );
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(uniqueCustomThemes));
  }, [allThemes]);

  // 현재 테마 ID 저장
  useEffect(() => {
    localStorage.setItem(CURRENT_THEME_KEY, currentThemeId);
  }, [currentThemeId]);

  const selectTheme = (themeId: string) => {
    const theme = allThemes.find((t) => t.id === themeId);
    if (theme) {
      setCurrentThemeId(themeId);
      applyTheme(theme);
    }
  };

  const createCustomTheme = (theme: Theme) => {
    setAllThemes((prev) => [...prev, theme]);
    setCurrentThemeId(theme.id);
  };

  const updateCustomTheme = (themeId: string, updates: { name: string; colors: ThemeColors }) => {
    setAllThemes((prev) =>
      prev.map((t) => (t.id === themeId ? { ...t, ...updates } : t))
    );
    if (currentThemeId === themeId) {
      const updatedTheme = { ...currentTheme, ...updates };
      applyTheme(updatedTheme);
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    setAllThemes((prev) => prev.filter((t) => t.id !== themeId));
    if (currentThemeId === themeId) {
      // 삭제된 테마가 현재 테마인 경우, 첫 번째 프리셋 테마로 변경
      setCurrentThemeId(PRESET_THEMES[0]?.id || 'brunia');
    }
  };

  const previewTheme = (colors: ThemeColors) => {
    // 배경색과 표면색 명확히 구분
    document.documentElement.style.setProperty('--color-background', colors.background);
    document.documentElement.style.setProperty('--color-surface', colors.surface);
    
    // 기존 CSS 변수 구조 유지
    document.documentElement.style.setProperty('--main-color', colors.primary);
    document.documentElement.style.setProperty('--sub-color', colors.secondary);
    document.documentElement.style.setProperty('--accent-color', colors.accent);
    document.documentElement.style.setProperty('--background-color', colors.surface); // 하위 호환성
    document.documentElement.style.setProperty('--line-color', colors.border);
    document.documentElement.style.setProperty('--text-primary', colors.text);
    document.documentElement.style.setProperty('--text-secondary', colors.textSecondary);
    document.documentElement.style.setProperty('--bg-primary', colors.background);
    document.documentElement.style.setProperty('--bg-secondary', colors.surface);
    document.documentElement.style.setProperty('--border-color', colors.border);
    document.documentElement.style.setProperty('--color-danger', colors.danger);
    document.documentElement.style.setProperty('--color-danger-light', colors.dangerLight);
    
    // sub-color의 밝기에 따라 텍스트 색상 자동 계산
    const subColorText = isLight(colors.secondary) ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--sub-color-text', subColorText);
    
    // main-color의 밝기에 따라 텍스트 색상 자동 계산
    const mainColorText = isLight(colors.primary) ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--main-color-text', mainColorText);
    
    // accent-color의 밝기에 따라 텍스트 색상 자동 계산
    const accentColorText = isLight(colors.accent) ? '#000000' : '#ffffff';
    document.documentElement.style.setProperty('--accent-color-text', accentColorText);
  };

  const resetPreview = () => {
    applyTheme(currentTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        allThemes,
        selectTheme,
        createCustomTheme,
        updateCustomTheme,
        deleteCustomTheme,
        previewTheme,
        resetPreview,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}


