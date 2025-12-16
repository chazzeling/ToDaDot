import { create } from 'zustand';
import { Sticker } from '../types';

export type TabId = 'Calendar' | 'Matrix' | 'Category' | 'Record';

interface StickerState {
  // 탭별 스티커 데이터
  stickersByTab: Record<string, Sticker[]>;
  currentTabId: string;
  
  selectedStickerId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  draggingId: string | null;
  resizingId: string | null;
  rotatingId: string | null;
  
  // Actions
  setTab: (tabId: string) => void;
  updateStickers: (tabId: string, newStickers: Sticker[]) => void;
  setStickers: (tabId: string, stickers: Sticker[]) => void;
  // 🚨 무한 증식 방지: currentTabId를 자동으로 사용하는 addSticker
  addSticker: (newSticker: Sticker) => void;
  updateSticker: (tabId: string, id: string, updates: Partial<Sticker>) => void;
  deleteSticker: (tabId: string, id: string) => void;
  getStickers: (tabId: string) => Sticker[];
  setSelectedStickerId: (id: string | null) => void;
  
  // Drag/Resize/Rotate actions
  startDragging: (id: string) => void;
  stopDragging: () => void;
  startResizing: (id: string) => void;
  stopResizing: () => void;
  startRotating: (id: string) => void;
  stopRotating: () => void;
  
  // Reset state
  reset: () => void;
}

const initialState = {
  stickersByTab: {
    'Calendar': [],
    'Matrix': [],
    'Category': [],
    'Record': [],
  } as Record<string, Sticker[]>,
  currentTabId: 'Matrix',
  selectedStickerId: null,
  isDragging: false,
  isResizing: false,
  isRotating: false,
  draggingId: null,
  resizingId: null,
  rotatingId: null,
};

export const useStickerStore = create<StickerState>((set, get) => ({
  ...initialState,
  
  setTab: (tabId) => set({ currentTabId: tabId }),
  
  updateStickers: (tabId, newStickers) => set((state) => {
    // 🚨 탭별 분리 강화: 특정 탭의 스티커만 업데이트
    return {
      stickersByTab: {
        ...state.stickersByTab,
        [tabId]: newStickers, // 오직 지정된 탭만 업데이트
      },
    };
  }),
  
  setStickers: (tabId, stickers) => set((state) => ({
    stickersByTab: {
      ...state.stickersByTab,
      [tabId]: stickers,
    },
  })),
  
  // 🚨 addSticker 구현 (무한 증식 방지)
  addSticker: (newSticker) => set((state) => {
    const tabId = state.currentTabId;
    const currentStickers = state.stickersByTab[tabId] || [];
    
    // 중복 체크: 같은 ID가 이미 있으면 추가하지 않음
    const exists = currentStickers.some(s => s.id === newSticker.id);
    if (exists) {
      return state; // 변경 없음
    }
    
    // 새 스티커를 기존 배열에 추가
    const newStickers = [...currentStickers, newSticker];
    return {
      stickersByTab: {
        ...state.stickersByTab,
        [tabId]: newStickers,
      },
    };
  }),
  
  updateSticker: (tabId, id, updates) => set((state) => {
    // 🚨 탭별 분리 강화: 특정 탭의 스티커만 업데이트
    const targetTabStickers = state.stickersByTab[tabId] || [];
    return {
      stickersByTab: {
        ...state.stickersByTab,
        [tabId]: targetTabStickers.map((sticker) =>
          sticker.id === id ? { ...sticker, ...updates } : sticker
        ),
      },
    };
  }),
  
  deleteSticker: (tabId, id) => set((state) => {
    // 🚨 탭별 분리 강화: 특정 탭의 스티커만 삭제
    const targetTabStickers = state.stickersByTab[tabId] || [];
    return {
      stickersByTab: {
        ...state.stickersByTab,
        [tabId]: targetTabStickers.filter((sticker) => sticker.id !== id), // 오직 지정된 탭만 필터링
      },
      selectedStickerId: state.selectedStickerId === id ? null : state.selectedStickerId,
    };
  }),
  
  getStickers: (tabId) => get().stickersByTab[tabId] || [],
  
  setSelectedStickerId: (id) => set({ selectedStickerId: id }),
  
  startDragging: (id) => set({
    isDragging: true,
    draggingId: id,
    selectedStickerId: id,
  }),
  
  stopDragging: () => set({
    isDragging: false,
    draggingId: null,
  }),
  
  startResizing: (id) => set({
    isResizing: true,
    resizingId: id,
    selectedStickerId: id,
  }),
  
  stopResizing: () => set({
    isResizing: false,
    resizingId: null,
  }),
  
  startRotating: (id) => set({
    isRotating: true,
    rotatingId: id,
    selectedStickerId: id,
  }),
  
  stopRotating: () => set({
    isRotating: false,
    rotatingId: null,
  }),
  
  reset: () => set(initialState),
}));

