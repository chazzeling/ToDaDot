import { useState, useEffect, useRef } from 'react';
import { TimeBlock, TimePlannerCategory, TimePlannerData, DateString } from '../types';
import { RotateCcw, ChevronLeft, PanelRightOpen } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import * as timeRecordService from '../firebase/timePlannerService';
import './TimeRecordPanel.css';

// 기본 카테고리 색상
const defaultColors: string[] = [
  '#ffccceff', // 밝은 분홍
  '#FFD9B3',   // 복숭아
  '#FFF2B2',   // 노랑
  '#b7ffcdff', // 연두
  '#c7c9ffff', // 연보라
  '#e0c6ffff', // 라벤더
  '#FA8B8B',   // 색상 7
  '#D3FAA3',   // 색상 8
  '#6493FA',   // 색상 9
  '#F5F5F5',   // 색상 10
  '#DBDBDB',   // 색상 11
  '#9E9E9E',   // 색상 12
];

const STORAGE_KEY = 'time-record-data';
const CATEGORIES_STORAGE_KEY = 'time-record-categories';

interface TimeRecordPanelProps {
  selectedDate: DateString;
  onReset?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function TimeRecordPanel({ selectedDate, onReset, isCollapsed = false, onToggleCollapse }: TimeRecordPanelProps) {
  // 💾 핵심: 모든 데이터는 localStorage와 Firebase 모두에 저장됩니다
  // 🚦 로딩 상태 추가: 데이터 로딩이 완료될 때까지 빈 화면 방지
  const { user, isAuthenticated } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [categories, setCategories] = useState<TimePlannerCategory[]>(() => {
    // 카테고리는 전역 설정이므로 localStorage에서 로드
    const saved = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (saved) {
      try {
        const savedCategories = JSON.parse(saved);
        return defaultColors.map((color, index) => ({
          color,
          name: savedCategories[index]?.name || `색상 ${index + 1}`,
        }));
      } catch {
        return defaultColors.map((color, index) => ({
          color,
          name: `색상 ${index + 1}`,
        }));
      }
    }
    return defaultColors.map((color, index) => ({
      color,
      name: `색상 ${index + 1}`,
    }));
  });
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const blocksRef = useRef<TimeBlock[]>([]);
  const categoriesRef = useRef<TimePlannerCategory[]>([]);
  
  // 🛑 이중 실행 강제 방지: 데이터 로딩이 완료되었음을 영구적으로 추적
  const hasLoadedRef = useRef<Record<DateString, boolean>>({});
  const isLoadingRef = useRef(false);

  // selectedDate 변경 전 이전 날짜 데이터 저장
  const previousDateRef = useRef<DateString>(selectedDate);
  
  useEffect(() => {
    // 날짜가 변경되기 전에 이전 날짜의 데이터를 저장
    if (previousDateRef.current !== selectedDate && !isInitialLoad) {
      const currentBlocks = blocksRef.current;
      const currentCategories = categoriesRef.current;
      
      if (currentBlocks.length > 0 || currentCategories.length > 0) {
        const saved = localStorage.getItem(STORAGE_KEY);
        let allData: Record<DateString, TimePlannerData> = {};
        if (saved) {
          try {
            allData = JSON.parse(saved);
          } catch {
            allData = {};
          }
        }
        // 이전 날짜의 데이터를 저장
        allData[previousDateRef.current] = {
          date: previousDateRef.current,
          blocks: currentBlocks,
          categories: currentCategories,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      }
    }
    
    previousDateRef.current = selectedDate;
  }, [selectedDate, isInitialLoad]);

  // 🔄 인증 상태 변경 시 hasLoadedRef 리셋 (Firebase 동기화를 위해)
  const previousUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (user && user.uid !== previousUserRef.current) {
      console.log('🔄 User changed, resetting hasLoadedRef for Firebase sync');
      hasLoadedRef.current = {};
      previousUserRef.current = user.uid;
    } else if (!user && previousUserRef.current) {
      console.log('🔄 User logged out, resetting hasLoadedRef');
      hasLoadedRef.current = {};
      previousUserRef.current = null;
    }
  }, [user]);

  // 🔄 핵심: 컴포넌트 마운트 시 및 selectedDate 변경 시 데이터 로드 (localStorage + Firebase)
  // 🛑 이중 실행 강제 방지: hasLoadedRef로 해당 날짜의 데이터가 이미 로드되었는지 확인
  // 🎣 의존성 배열은 [selectedDate, isAuthenticated, user]로 유지하되, 로딩 중에는 저장이 실행되지 않도록 보장
  useEffect(() => {
    console.log('🔄 TimeRecordPanel useEffect triggered:', { selectedDate, isAuthenticated, hasUser: !!user, userId: user?.uid, hasLoaded: hasLoadedRef.current[selectedDate], previousDate: previousDateRef.current, isLoading: isLoadingRef.current });
    
    // 🛑 이중 실행 강제 방지: 이미 해당 날짜의 데이터를 로드했으면 실행하지 않음
    // 단, 날짜가 변경된 경우에는 새로운 날짜이므로 로드가 필요함
    // 🔄 Firebase 동기화를 위해 인증된 경우에는 항상 Firebase에서 로드 시도
    if (hasLoadedRef.current[selectedDate] && previousDateRef.current === selectedDate && !isAuthenticated) {
      console.log('⏭️ Skipping load - already loaded for date (not authenticated):', selectedDate);
      return;
    }
    
    // 🔄 인증된 경우 Firebase에서 최신 데이터를 가져오기 위해 항상 로드
    if (hasLoadedRef.current[selectedDate] && previousDateRef.current === selectedDate && isAuthenticated) {
      console.log('🔄 Already loaded but authenticated - forcing Firebase reload for sync');
      // hasLoadedRef를 리셋하여 Firebase 로드 강제
      hasLoadedRef.current[selectedDate] = false;
    }
    
    // 🛑 이중 실행 강제 방지: 이미 로딩 중이면 실행하지 않음
    if (isLoadingRef.current) {
      console.log('⏭️ Skipping load - already loading');
      return;
    }
    
    // 🚦 로딩 상태 시작 (저장 useEffect가 실행되지 않도록)
    isLoadingRef.current = true;
    setIsLoading(true);
    // ⏱️ 로딩 중임을 표시하여 저장 로직이 실행되지 않도록 함
    setIsInitialLoad(true);
    
    const loadData = async () => {
      let dayData: TimePlannerData | null = null;
      
      // 1. localStorage에서 데이터 로드
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const allData: Record<DateString, TimePlannerData> = JSON.parse(saved);
          dayData = allData[selectedDate] || null;
          console.log('📦 Loaded from localStorage:', dayData ? `blocks: ${dayData.blocks?.length || 0}` : 'no data');
        } catch (error) {
          console.error('Failed to parse localStorage data:', error);
        }
      } else {
        console.log('📦 No localStorage data found');
      }
      
      // 2. Firebase에서 데이터 로드 (인증된 경우)
      console.log('🔍 Checking Firebase load condition:', { isAuthenticated, hasUser: !!user });
      if (isAuthenticated && user) {
        console.log('🔍 Attempting to load time record data from Firebase for:', selectedDate, 'user:', user.uid);
        try {
          const firebaseData = await timeRecordService.getTimeRecordData(selectedDate);
          console.log('📥 Firebase data received:', firebaseData ? 'exists' : 'null', firebaseData);
          if (firebaseData) {
            console.log('📥 Loaded time record data from Firebase:', selectedDate, 'blocks:', firebaseData.blocks?.length || 0, 'data:', firebaseData);
            // Firebase 데이터가 있으면 무조건 우선 사용 (동기화 우선)
            // Firebase 데이터가 있으면 항상 사용 (blocks가 없어도 구조는 유지)
            dayData = firebaseData;
            console.log('✅ Using Firebase data for time record:', selectedDate, 'blocks count:', dayData.blocks?.length || 0);
          } else {
            console.log('ℹ️ No Firebase data found for time record:', selectedDate, 'using localStorage');
          }
          
          // 카테고리도 Firebase에서 로드 (전역 설정)
          try {
            const firebaseCategories = await timeRecordService.getTimeRecordCategories();
            if (firebaseCategories && firebaseCategories.length > 0) {
              // Firebase 카테고리가 있으면 사용
              const updatedCategories = defaultColors.map((color, index) => ({
                color,
                name: firebaseCategories[index]?.name || `색상 ${index + 1}`,
              }));
              setCategories(updatedCategories);
              categoriesRef.current = updatedCategories;
              // localStorage에도 저장
              localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories));
            }
          } catch (error) {
            console.error('Failed to load categories from Firebase:', error);
          }
        } catch (error) {
          console.error('Failed to load data from Firebase:', error);
          // Firebase 로드 실패 시 localStorage 데이터 사용
        }
      }
      
      // 3. 데이터 적용
      console.log('🔍 Applying time record data for:', selectedDate, 'dayData:', dayData, 'blocks:', dayData?.blocks?.length || 0);
      
      if (dayData && dayData.blocks && Array.isArray(dayData.blocks)) {
        const loadedBlocks = dayData.blocks;
        console.log('📦 Time record blocks to apply:', loadedBlocks.length, 'blocks:', loadedBlocks);
        
        // 🔍 유효성 검사: 블록 데이터가 유효한지 확인
        const isValidBlocks = loadedBlocks.length === 0 || loadedBlocks.every(block => 
          block && 
          typeof block.id === 'string' && 
          typeof block.startTime === 'number' && 
          typeof block.endTime === 'number' &&
          typeof block.color === 'string'
        );
        
        if (isValidBlocks) {
          console.log('✅ Setting time record blocks:', loadedBlocks.length);
          setBlocks(loadedBlocks);
          blocksRef.current = loadedBlocks;
          
          if (dayData.categories && dayData.categories.length > 0) {
            const updatedCategories = defaultColors.map((color, index) => ({
              color,
              name: dayData.categories[index]?.name || `색상 ${index + 1}`,
            }));
            setCategories(updatedCategories);
            categoriesRef.current = updatedCategories;
          }
          
          hasLoadedRef.current[selectedDate] = true;
        } else {
          console.warn('⚠️ Invalid blocks data, clearing:', loadedBlocks);
          setBlocks([]);
          blocksRef.current = [];
          hasLoadedRef.current[selectedDate] = true;
        }
      } else {
        console.log('ℹ️ No blocks data, setting empty array');
        setBlocks([]);
        blocksRef.current = [];
        hasLoadedRef.current[selectedDate] = true;
      }
      
      // ⏱️ 로딩 완료
      setIsInitialLoad(false);
      isLoadingRef.current = false;
      setIsLoading(false);
    };
    
    loadData();
  }, [selectedDate, isAuthenticated, user]);

  // 카테고리 설정 저장 (localStorage + Firebase)
  useEffect(() => {
    if (isInitialLoad || isLoading) {
      return;
    }
    
    // localStorage에 저장
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
    
    // Firebase에 저장 (인증된 경우)
    if (isAuthenticated && user) {
      timeRecordService.saveTimeRecordCategories(categories).catch(error => {
        console.error('Failed to save categories to Firebase:', error);
      });
    }
  }, [categories, isAuthenticated, user, isInitialLoad, isLoading]);

  // blocks와 categories ref 업데이트
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // 💾 핵심: blocks나 categories가 변경될 때마다 즉시 localStorage와 Firebase에 저장
  // ⏱️ 로딩 중에는 절대 저장하지 않음 (로딩 직후 빈 데이터로 덮어쓰는 것을 방지)
  // 🔑 localStorage 저장 자동 트리거 차단: 로딩 과정에서 설정된 상태값을 이용하여 저장 차단
  useEffect(() => {
    // 🛑 초기 로드 중이거나 로딩 중일 때는 저장하지 않음 (무한 루프 및 빈 데이터 덮어쓰기 방지)
    if (isInitialLoad || isLoading || isLoadingRef.current) {
      return;
    }
    
    // 🔑 추가 조건: 해당 날짜의 데이터가 아직 로드되지 않았으면 저장하지 않음
    if (!hasLoadedRef.current[selectedDate]) {
      return;
    }
    
    // 저장 실행
    saveDataToStorage(blocks, categories);
  }, [blocks, categories, selectedDate, isInitialLoad, isLoading, isAuthenticated, user]);

  // 🔄 핵심: 컴포넌트 언마운트 시(탭 이동 시)에도 데이터 저장 보장
  // 탭 이동은 데이터에 영향을 주지 않아야 하므로, 언마운트 전에 반드시 저장합니다
  useEffect(() => {
    // 페이지 언로드 전에도 저장 (앱 종료 시)
    const handleBeforeUnload = () => {
      const currentBlocks = blocksRef.current;
      const currentCategories = categoriesRef.current;
      const currentDate = selectedDate;
      
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let allData: Record<DateString, TimePlannerData> = {};
        if (saved) {
          try {
            allData = JSON.parse(saved);
          } catch {
            allData = {};
          }
        }
        allData[currentDate] = {
          date: currentDate,
          blocks: currentBlocks,
          categories: currentCategories,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      } catch (error) {
        // 저장 실패 시 무시
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // cleanup 함수: 컴포넌트 언마운트 시(탭 이동 시) 현재 상태를 localStorage에 저장
      // ref를 사용하여 최신 값 참조 (클로저 문제 방지)
      const currentBlocks = blocksRef.current;
      const currentCategories = categoriesRef.current;
      const currentDate = selectedDate;
      
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        let allData: Record<DateString, TimePlannerData> = {};
        if (saved) {
          try {
            allData = JSON.parse(saved);
          } catch {
            allData = {};
          }
        }
        // 언마운트 시에도 현재 날짜의 데이터를 저장
        allData[currentDate] = {
          date: currentDate,
          blocks: currentBlocks,
          categories: currentCategories,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      } catch (error) {
        // 저장 실패 시 무시
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedDate]);

  // 🗑️ 핵심: 리셋 버튼을 눌렀을 때만 localStorage에서 데이터 삭제
  // 탭 이동(언마운트)은 이 함수를 호출하지 않으므로 데이터가 유지됩니다
  const handleResetBlocks = () => {
    // 상태 초기화
    setBlocks([]);
    setShowResetConfirm(false);
    
    // localStorage에서도 해당 날짜의 데이터를 삭제 (빈 배열로 저장)
    saveDataToStorage([], categories);
    
    // ref도 업데이트
    blocksRef.current = [];
  };

  // 시간을 분으로 변환 (0시 0분 = 0, 23시 50분 = 1430)
  const timeToMinutes = (hour: number, minute: number): number => {
    return hour * 60 + minute;
  };

  // 분을 시간으로 변환
  const minutesToTime = (minutes: number): { hour: number; minute: number } => {
    return {
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
    };
  };

  // 셀 인덱스를 분으로 변환
  const cellIndexToMinutes = (cellIndex: number): number => {
    const row = Math.floor(cellIndex / 6);
    const col = cellIndex % 6;
    return row * 60 + col * 10;
  };

  // 분을 셀 인덱스로 변환
  const minutesToCellIndex = (minutes: number): number => {
    const row = Math.floor(minutes / 60);
    const col = Math.floor((minutes % 60) / 10);
    return row * 6 + col;
  };

  // 렌더링된 블록 정보 (셀에 속한 블록 찾기)
  const getBlockAtCell = (cellIndex: number): TimeBlock | null => {
    const cellMinutes = cellIndexToMinutes(cellIndex);
    // 셀의 시작 시간과 끝 시간 (정확히 셀 범위 내)
    const cellStart = cellMinutes;
    const cellEnd = cellMinutes + 10;
    
    // 이 셀의 시작 시간이 포함되는 블록 찾기 (정확한 매칭)
    const exactMatch = blocks.find(block => {
      // 셀의 시작 시간이 블록 범위에 정확히 포함되는지
      return cellStart >= block.startTime && cellStart < block.endTime;
    });
    
    if (exactMatch) return exactMatch;
    
    // 정확한 매칭이 없으면 셀 범위와 겹치는 블록 중 가장 먼저 시작하는 것
    const overlappingBlocks = blocks.filter(block => {
      return block.startTime < cellEnd && block.endTime > cellStart;
    });
    
    if (overlappingBlocks.length === 0) return null;
    
    // 가장 먼저 시작하는 블록 반환
    return overlappingBlocks.reduce((prev, curr) => 
      prev.startTime < curr.startTime ? prev : curr
    );
  };

  // 💾 핵심: 데이터 저장 헬퍼 함수 - 모든 변경사항을 즉시 localStorage와 Firebase에 저장
  // 이 함수는 블록 클릭, 카테고리 변경 등 모든 데이터 변경 시점에 호출됩니다
  const saveDataToStorage = async (blocksToSave: TimeBlock[], categoriesToSave: TimePlannerCategory[]) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let allData: Record<DateString, TimePlannerData> = {};
      if (saved) {
        try {
          allData = JSON.parse(saved);
        } catch {
          allData = {};
        }
      }
      
      // 현재 날짜의 데이터를 localStorage에 저장
      const dataToSave: TimePlannerData = {
        date: selectedDate,
        blocks: blocksToSave,
        categories: categoriesToSave,
      };
      
      allData[selectedDate] = dataToSave;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      
      // ref도 업데이트하여 언마운트 시 최신 데이터 보장
      blocksRef.current = blocksToSave;
      categoriesRef.current = categoriesToSave;
      
      // Firebase에 저장 (인증된 경우)
      if (isAuthenticated && user) {
        try {
          await timeRecordService.saveTimeRecordData(dataToSave);
          console.log('✅ Time record data saved to Firebase:', dataToSave.date, 'blocks:', blocksToSave.length);
        } catch (error) {
          console.error('❌ Failed to save time record data to Firebase:', error);
        }
      }
    } catch (error) {
      // 저장 실패 시 무시
    }
  };

  // 드래그로 색 입히기
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartCell, setDragStartCell] = useState<number | null>(null);
  const [dragEndCell, setDragEndCell] = useState<number | null>(null);
  const justDraggedRef = useRef(false);

  const handleCellMouseDown = (e: React.MouseEvent, cellIndex: number) => {
    if (e.button !== 0) return;
    if (editingCategoryIndex !== null) return;
    
    // 클릭으로 색상 변경하려는 경우 드래그 시작하지 않음
    const existingBlock = getBlockAtCell(cellIndex);
    if (existingBlock) {
      // 기존 블록이 있으면 드래그하지 않고 클릭으로 처리
      return;
    }
    
    setIsDragging(true);
    setDragStartCell(cellIndex);
    setDragEndCell(cellIndex);
    e.preventDefault();
  };

  const handleCellMouseMove = (e: React.MouseEvent, cellIndex: number) => {
    if (!isDragging || dragStartCell === null) return;
    setDragEndCell(cellIndex);
    e.preventDefault();
  };

  const handleCellMouseUp = (e: React.MouseEvent) => {
    if (!isDragging || dragStartCell === null || dragEndCell === null) {
      setIsDragging(false);
      setDragStartCell(null);
      setDragEndCell(null);
      return;
    }

    const startCell = Math.min(dragStartCell, dragEndCell);
    const endCell = Math.max(dragStartCell, dragEndCell);
    
    // 기존 블록 제거하지 않고, 드래그한 각 셀마다 개별 블록 추가
    const newBlocks: TimeBlock[] = [];
    const selectedColor = categories[selectedCategoryIndex]?.color || defaultColors[0];
    const selectedName = categories[selectedCategoryIndex]?.name || '색상 1';
    
    for (let cellIndex = startCell; cellIndex <= endCell; cellIndex++) {
      // 이미 블록이 있는 셀은 건너뛰기
      const existingBlock = blocks.find(block => {
        const blockStart = minutesToCellIndex(block.startTime);
        const blockEnd = minutesToCellIndex(block.endTime - 1);
        return cellIndex >= blockStart && cellIndex <= blockEnd;
      });
      
      if (!existingBlock) {
        const cellMinutes = cellIndexToMinutes(cellIndex);
        const newBlock: TimeBlock = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + cellIndex,
          startTime: cellMinutes,
          endTime: cellMinutes + 10,
          color: selectedColor,
          categoryName: selectedName,
          label: '',
        };
        newBlocks.push(newBlock);
      }
    }

    const finalBlocks = [...blocks, ...newBlocks];
    setBlocks(finalBlocks);
    saveDataToStorage(finalBlocks, categories);

    setIsDragging(false);
    setDragStartCell(null);
    setDragEndCell(null);
    justDraggedRef.current = true;
    setTimeout(() => {
      justDraggedRef.current = false;
    }, 300);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        if (dragStartCell !== null && dragEndCell !== null) {
          const startCell = Math.min(dragStartCell, dragEndCell);
          const endCell = Math.max(dragStartCell, dragEndCell);
          
          // 기존 블록 제거하지 않고, 드래그한 각 셀마다 개별 블록 추가
          const newBlocks: TimeBlock[] = [];
          const selectedColor = categories[selectedCategoryIndex]?.color || defaultColors[0];
          const selectedName = categories[selectedCategoryIndex]?.name || '색상 1';
          
          for (let cellIndex = startCell; cellIndex <= endCell; cellIndex++) {
            // 이미 블록이 있는 셀은 건너뛰기
            const existingBlock = blocks.find(block => {
              const blockStart = minutesToCellIndex(block.startTime);
              const blockEnd = minutesToCellIndex(block.endTime - 1);
              return cellIndex >= blockStart && cellIndex <= blockEnd;
            });
            
            if (!existingBlock) {
              const cellMinutes = cellIndexToMinutes(cellIndex);
              const newBlock: TimeBlock = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + cellIndex,
                startTime: cellMinutes,
                endTime: cellMinutes + 10,
                color: selectedColor,
                categoryName: selectedName,
                label: '',
              };
              newBlocks.push(newBlock);
            }
          }

          const finalBlocks = [...blocks, ...newBlocks];
          setBlocks(finalBlocks);
          saveDataToStorage(finalBlocks, categories);
          justDraggedRef.current = true;
          setTimeout(() => {
            justDraggedRef.current = false;
          }, 300);
        }
        setIsDragging(false);
        setDragStartCell(null);
        setDragEndCell(null);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, dragStartCell, dragEndCell, blocks, categories, selectedCategoryIndex]);

  // 단일 셀 클릭 (기존 블록 색상 변경용)
  const handleCellClick = (e: React.MouseEvent, cellIndex: number) => {
    if (e.button !== 0) return; // 왼쪽 버튼만
    // 카테고리 편집 중이면 클릭 방지
    if (editingCategoryIndex !== null) return;
    // 방금 드래그했으면 클릭 무시
    if (justDraggedRef.current) return;
    
    const cellMinutes = cellIndexToMinutes(cellIndex);
    const existingBlock = getBlockAtCell(cellIndex);
    
    // 이미 블록이 있으면 색상만 변경
    if (existingBlock) {
      const updatedBlocks = blocks.map(block => 
        block.id === existingBlock.id
          ? {
              ...block,
              color: categories[selectedCategoryIndex]?.color || defaultColors[0],
              categoryName: categories[selectedCategoryIndex]?.name || '색상 1',
            }
          : block
      );
      setBlocks(updatedBlocks);
      // 즉시 저장하여 탭 전환 시 데이터 보존
      saveDataToStorage(updatedBlocks, categories);
      return;
    }
    
    // 새 블록 추가 (한 칸만)
    const newBlock: TimeBlock = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      startTime: cellMinutes,
      endTime: cellMinutes + 10,
      color: categories[selectedCategoryIndex]?.color || defaultColors[0],
      categoryName: categories[selectedCategoryIndex]?.name || '색상 1',
      label: '',
    };
    
    const updatedBlocks = [...blocks, newBlock];
    setBlocks(updatedBlocks);
    // 즉시 저장하여 탭 전환 시 데이터 보존
    saveDataToStorage(updatedBlocks, categories);
  };
  
  // 편집 모드일 때 input에 포커스
  useEffect(() => {
    if (editingCategoryIndex !== null && categoryInputRef.current) {
      categoryInputRef.current.focus();
    }
  }, [editingCategoryIndex]);

  
  // 카테고리 이름 편집 시작
  const handleCategoryNameEdit = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.detail === 2) { // 더블클릭
      setEditingCategoryIndex(index);
      setEditingCategoryName(categories[index].name);
    }
  };
  
  // 카테고리 이름 저장
  const handleCategoryNameSave = (index: number) => {
    const updatedCategories = [...categories];
    updatedCategories[index] = {
      ...updatedCategories[index],
      name: editingCategoryName || `색상 ${index + 1}`,
    };
    setCategories(updatedCategories);
    setEditingCategoryIndex(null);
    setEditingCategoryName('');
    // 즉시 저장하여 탭 전환 시 데이터 보존
    saveDataToStorage(blocks, updatedCategories);
  };

  // 블록이 시작되는 셀인지 확인 (정확한 매칭)
  const isBlockStartCell = (cellIndex: number, block: TimeBlock): boolean => {
    const blockStartCellIndex = minutesToCellIndex(block.startTime);
    return cellIndex === blockStartCellIndex;
  };



  // 🚦 로딩 중일 때는 빈 컨테이너만 렌더링 (빈 상태가 화면에 보이는 것을 방지)
  if (isLoading) {
    return (
      <div className={`time-planner-panel ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-background"></div>
        <div className="time-planner-header">
          <div className="time-planner-header-title">
            <h3>시간 기록</h3>
          </div>
        </div>
        {/* 로딩 중에는 빈 컨테이너만 표시 */}
      </div>
    );
  }

  if (isCollapsed) {
    return (
      <div className="time-record-wrapper">
        <div className={`time-planner-panel collapsed`}>
          <button className="collapse-toggle" onClick={onToggleCollapse}>
            <PanelRightOpen size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="time-record-wrapper">
      <div className="time-planner-panel">
        <div className="time-planner-header">
        <div className="time-planner-header-title">
          <h3>시간 기록</h3>
          {onToggleCollapse && (
            <button className="collapse-toggle-inline" onClick={onToggleCollapse}>
              <ChevronLeft size={16} />
            </button>
          )}
          <button
            className="time-planner-reset-btn"
            onClick={() => setShowResetConfirm(true)}
            disabled={blocks.length === 0}
            title="시간 블록 리셋"
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <p className="time-planner-hint">더블 클릭으로 라벨 이름을 변경합니다.</p>
      </div>

      <ConfirmDialog
        isOpen={showResetConfirm}
        message="타임 테이블을 정말 리셋할까요?"
        confirmText="리셋"
        cancelText="취소"
        onConfirm={handleResetBlocks}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* 카테고리 선택 UI - 2단 구성 */}
      <div className="time-planner-categories">
        <div className="category-row">
          {categories.slice(0, 6).map((category, index) => (
            <div
              key={index}
              className={`category-selector-wrapper ${selectedCategoryIndex === index ? 'selected' : ''}`}
              onDoubleClick={(e) => handleCategoryNameEdit(index, e)}
            >
              {editingCategoryIndex === index ? (
                <div className="category-editor">
                  <div
                    className="category-color-circle"
                    style={{
                      backgroundColor: category.color,
                      border: '1.5px solid var(--border-color)',
                    }}
                  />
                  <input
                    ref={categoryInputRef}
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onBlur={() => handleCategoryNameSave(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCategoryNameSave(index);
                      } else if (e.key === 'Escape') {
                        setEditingCategoryIndex(null);
                        setEditingCategoryName('');
                      }
                    }}
                    className="category-name-input"
                    onClick={(e) => e.stopPropagation()}
                    maxLength={9}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  className={`category-selector ${selectedCategoryIndex === index ? 'selected' : ''}`}
                  onClick={() => setSelectedCategoryIndex(index)}
                >
                  <div
                    className="category-color-circle"
                    style={{
                      backgroundColor: category.color,
                      border: selectedCategoryIndex === index ? '1.5px solid var(--accent-color)' : '1.5px solid var(--border-color)',
                    }}
                  />
                  <span className="category-name-text">
                    {category.name}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="category-row">
          {categories.slice(6, 12).map((category, index) => {
            const actualIndex = index + 6;
            return (
              <div
                key={actualIndex}
                className={`category-selector-wrapper ${selectedCategoryIndex === actualIndex ? 'selected' : ''}`}
                onDoubleClick={(e) => handleCategoryNameEdit(actualIndex, e)}
              >
                {editingCategoryIndex === actualIndex ? (
                  <div className="category-editor">
                    <div
                      className="category-color-circle"
                      style={{
                        backgroundColor: category.color,
                        border: '1.5px solid var(--border-color)',
                      }}
                    />
                    <input
                      ref={categoryInputRef}
                      type="text"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onBlur={() => handleCategoryNameSave(actualIndex)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCategoryNameSave(actualIndex);
                        } else if (e.key === 'Escape') {
                          setEditingCategoryIndex(null);
                          setEditingCategoryName('');
                        }
                      }}
                      className="category-name-input"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    className={`category-selector ${selectedCategoryIndex === actualIndex ? 'selected' : ''}`}
                    onClick={() => setSelectedCategoryIndex(actualIndex)}
                  >
                    <div
                      className="category-color-circle"
                      style={{
                        backgroundColor: category.color,
                        border: selectedCategoryIndex === actualIndex ? '1.5px solid var(--accent-color)' : '1.5px solid var(--border-color)',
                      }}
                    />
                    <span className="category-name-text">
                      {category.name}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 시간 그리드 - 시간 숫자와 그리드 분리 */}
      <div className="time-planner-grid-wrapper" ref={gridRef}>
        {/* 시간 숫자 영역 (왼쪽) */}
        <div className="time-labels-container">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="time-label-row">
              <div className="time-label">{hour}</div>
            </div>
          ))}
        </div>

        {/* 144칸 그리드 영역 (오른쪽) */}
        <div className="time-grid-container">
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="time-row">
              {Array.from({ length: 6 }, (_, col) => {
                const cellIndex = hour * 6 + col;
                const block = getBlockAtCell(cellIndex);
                // 블록의 시작/끝 셀 확인
                let isBlockStart = false;
                let isBlockEnd = false;
                if (block) {
                  const cellMinutes = cellIndexToMinutes(cellIndex);
                  const blockStartCellIndex = minutesToCellIndex(block.startTime);
                  const blockEndCellIndex = minutesToCellIndex(block.endTime - 1);
                  isBlockStart = cellIndex === blockStartCellIndex;
                  isBlockEnd = cellIndex === blockEndCellIndex || (col === 5 && cellMinutes + 10 >= block.endTime);
                }

                return (
                  <div
                    key={cellIndex}
                    className={`time-cell ${block ? 'has-block' : ''} ${isBlockStart ? 'block-start' : ''} ${isBlockEnd ? 'block-end' : ''}`}
                    style={{
                      backgroundColor: block ? block.color : 'transparent',
                    }}
                    onMouseDown={(e) => handleCellMouseDown(e, cellIndex)}
                    onMouseMove={(e) => handleCellMouseMove(e, cellIndex)}
                    onMouseUp={(e) => handleCellMouseUp(e)}
                    onClick={(e) => handleCellClick(e, cellIndex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const existingBlock = getBlockAtCell(cellIndex);
                      if (existingBlock) {
                        const updatedBlocks = blocks.filter(b => b.id !== existingBlock.id);
                        setBlocks(updatedBlocks);
                        saveDataToStorage(updatedBlocks, categories);
                      }
                    }}
                  >
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

