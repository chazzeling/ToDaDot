import { useState, useRef, useEffect, useCallback } from 'react';
import './CalendarSticker.css';
import { Sticker } from '../types';

interface CalendarStickerProps {
  isExpanded: boolean;
  isEditMode?: boolean;
  stickers?: Sticker[];
  onStickersChange?: (stickers: Sticker[]) => void;
  onStickerUpdate?: (stickerId: string, positionX: number, positionY: number) => void;
  onStickerDelete?: (stickerId: string) => void;
}

export default function CalendarSticker({ 
  isExpanded, 
  isEditMode = false,
  stickers: externalStickers,
  onStickersChange,
  onStickerUpdate, 
  onStickerDelete,
  tabKey = 'calendar',
  containerSelector = '.calendar.expanded'
}: CalendarStickerProps) {
  const [stickers, setStickers] = useState<Sticker[]>(externalStickers || []);
  
  // externalStickers가 변경되면 내부 상태 업데이트
  // 단, 저장 직후에는 위치가 초기화되지 않도록 주의
  useEffect(() => {
    if (externalStickers === undefined || externalStickers === null) {
      return;
    }

    setStickers((prev) => {
      // externalStickers가 빈 배열이면 그대로 사용
      if (externalStickers.length === 0) {
        if (prev.length === 0) {
          return prev; // 변경 없음
        }
        // 빈 배열로 업데이트하여 모든 스티커 삭제
        return [];
      }

      // 삭제된 스티커 감지: externalStickers에 없는 ID 찾기
      const prevIds = new Set(prev.map(s => s.id));
      const externalIds = new Set(externalStickers.map(s => s.id));
      const deletedIds = [...prevIds].filter(id => !externalIds.has(id));

      // 삭제된 스티커가 있으면 externalStickers를 기준으로 즉시 업데이트
      if (deletedIds.length > 0) {
        // externalStickers에 있는 스티커만 유지하고 위치/크기 정보 유지
        const updated = externalStickers.map((newSticker) => {
          const existing = prev.find((s) => s.id === newSticker.id);
          if (existing) {
            // 기존 스티커의 모든 속성을 유지 (위치, 크기, 회전 등)
            return {
              ...newSticker,
              positionX: existing.positionX,
              positionY: existing.positionY,
              width: existing.width,
              height: existing.height,
              rotation: existing.rotation,
              zIndex: existing.zIndex,
              dayOffsetX: existing.dayOffsetX,
              dayOffsetY: existing.dayOffsetY,
              date: existing.date,
            };
          }
          return newSticker;
        });
        // 삭제된 스티커 제거 확인
        return updated;
      }

      // 추가된 스티커 감지: prev에 없는 ID 찾기
      const newIds = [...externalIds].filter(id => !prevIds.has(id));
      
      // 기존 스티커가 있고 새 스티커와 길이가 같으면 위치/크기 정보 유지
      if (prev.length > 0 && newIds.length === 0) {
        return externalStickers.map((newSticker) => {
          const existing = prev.find((s) => s.id === newSticker.id);
          if (existing) {
            // 기존 스티커의 모든 속성을 유지 (위치, 크기, 회전 등)
            return {
              ...newSticker,
              positionX: existing.positionX,
              positionY: existing.positionY,
              width: existing.width,
              height: existing.height,
              rotation: existing.rotation,
              zIndex: existing.zIndex,
              dayOffsetX: existing.dayOffsetX,
              dayOffsetY: existing.dayOffsetY,
              date: existing.date,
            };
          }
          return newSticker;
        });
      }

      // 새로운 스티커가 추가된 경우나 다른 변경사항
      return externalStickers.map((newSticker) => {
        const existing = prev.find((s) => s.id === newSticker.id);
        if (existing) {
          // 기존 스티커의 모든 속성을 유지 (위치, 크기, 회전 등)
          return {
            ...newSticker,
            positionX: existing.positionX,
            positionY: existing.positionY,
            width: existing.width,
            height: existing.height,
            rotation: existing.rotation,
            zIndex: existing.zIndex,
            dayOffsetX: existing.dayOffsetX,
            dayOffsetY: existing.dayOffsetY,
            date: existing.date,
          };
        }
        return newSticker;
      });
    });
  }, [externalStickers]);
  
  const [isLocked, setIsLocked] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [rotateStart, setRotateStart] = useState({ angle: 0, centerX: 0, centerY: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // requestAnimationFrame 최적화를 위한 ref
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ type: 'drag' | 'resize' | 'rotate'; data: any } | null>(null);
  
  // 최신 상태를 참조하기 위한 ref
  const stickersRef = useRef(stickers);
  const draggingIdRef = useRef(draggingId);
  const resizingIdRef = useRef(resizingId);
  const rotatingIdRef = useRef(rotatingId);
  const dragOffsetRef = useRef(dragOffset);
  const resizeStartRef = useRef(resizeStart);
  const rotateStartRef = useRef(rotateStart);
  
  // ref 업데이트
  useEffect(() => {
    stickersRef.current = stickers;
    draggingIdRef.current = draggingId;
    resizingIdRef.current = resizingId;
    rotatingIdRef.current = rotatingId;
    dragOffsetRef.current = dragOffset;
    resizeStartRef.current = resizeStart;
    rotateStartRef.current = rotateStart;
  }, [stickers, draggingId, resizingId, rotatingId, dragOffset, resizeStart, rotateStart]);

  // 전역 이벤트 핸들러를 ref로 저장 (순환 참조 방지)
  const handleGlobalMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleGlobalMouseUpRef = useRef<(() => void) | null>(null);

  // loadAllStickers를 먼저 정의
  const loadAllStickers = useCallback(async () => {
    try {
      if (!isExpanded || !isMounted) {
        return;
      }
      
      // window.electronAPI가 없어도 에러를 발생시키지 않음
      if (typeof window === 'undefined') {
        console.warn('window is undefined');
        setStickers([]);
        return;
      }
      
      if (!window.electronAPI || !window.electronAPI.dbGetAllStickers) {
        console.warn('window.electronAPI.dbGetAllStickers is not available, using local storage fallback');
        // Electron API가 없을 때는 로컬 스토리지에서 불러오기
        try {
          const storageKey = `stickers-${tabKey}`;
          const existingStickers = localStorage.getItem(storageKey);
          if (existingStickers) {
            const stickers = JSON.parse(existingStickers);
            setStickers(stickers);
            if (onStickersChange) {
              onStickersChange(stickers);
            }
          } else {
            setStickers([]);
          }
        } catch (error) {
          console.error('Failed to load stickers from local storage:', error);
          setStickers([]);
        }
        return;
      }
      
      // 모든 스티커를 불러오기 (날짜 무관)
      const allStickersData = await window.electronAPI.dbGetAllStickers();
      console.log('Loaded stickers data from DB:', allStickersData);
      
      if (!allStickersData || !Array.isArray(allStickersData)) {
        console.warn('Invalid stickers data:', allStickersData);
        // DB에서 불러오기 실패 시 로컬 스토리지에서 시도
        try {
          const storageKey = `stickers-${tabKey}`;
          const existingStickers = localStorage.getItem(storageKey);
          if (existingStickers) {
            const stickers = JSON.parse(existingStickers);
            setStickers(stickers);
            if (onStickersChange) {
              onStickersChange(stickers);
            }
          } else {
            setStickers([]);
          }
        } catch (error) {
          console.error('Failed to load stickers from local storage:', error);
          setStickers([]);
        }
        return;
      }
      
      const allStickers: Sticker[] = allStickersData.map((s: any) => ({
        id: s.id || '',
        imagePath: s.image_path || '',
        positionX: s.position_x || 0,
        positionY: s.position_y || 0,
        width: s.width || 80,
        height: s.height || 80,
      }));
      
      console.log('Processed stickers:', allStickers);
      setStickers(allStickers);
      if (onStickersChange) {
        onStickersChange(allStickers);
      }
    } catch (error) {
      console.error('Failed to load stickers:', error);
      setStickers([]);
    }
  }, [isExpanded, isMounted, onStickersChange, tabKey]);

  // 스티커 상태가 변경될 때마다 localStorage에 저장 (탭별로 구분)
  useEffect(() => {
    if (stickers.length > 0 || localStorage.getItem(`stickers-${tabKey}`)) {
      const storageKey = `stickers-${tabKey}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(stickers));
      } catch (error) {
        console.error('Failed to save stickers to local storage:', error);
      }
    }
  }, [stickers, tabKey]);

  useEffect(() => {
    setIsMounted(true);
    
    // 컴포넌트 언마운트 시 모든 로컬 상태 초기화 및 이벤트 리스너 정리
    return () => {
      setIsMounted(false);
      
      // window 이벤트 리스너 제거
      if (handleGlobalMouseMoveRef.current) {
        window.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
      }
      
      // requestAnimationFrame 취소
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      
      // 모든 로컬 상태 초기화
      setStickers([]);
      setIsLocked(false);
      setIsDeleteMode(false);
      setSelectedStickerId(null);
      setShowDeleteConfirm(null);
      setDraggingId(null);
      setDragOffset({ x: 0, y: 0 });
      setResizingId(null);
      setRotatingId(null);
      setSelectedSticker(null);
      setResizeStart({ x: 0, y: 0, width: 0, height: 0 });
      setRotateStart({ angle: 0, centerX: 0, centerY: 0 });
    };
  }, []);

  useEffect(() => {
    if (isExpanded && isMounted) {
      // 약간의 지연을 두어 컴포넌트가 완전히 마운트된 후 실행
      const timer = setTimeout(() => {
        if (isMounted && isExpanded) {
          try {
            loadAllStickers();
          } catch (error) {
            console.error('Error in loadAllStickers useEffect:', error);
            setStickers([]);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (!isExpanded) {
      // isExpanded가 false로 변경되면 스티커 상태 초기화
      setStickers([]);
      setSelectedStickerId(null);
      setShowDeleteConfirm(null);
      setSelectedSticker(null);
      setDraggingId(null);
      setResizingId(null);
      setRotatingId(null);
    }
  }, [isExpanded, isMounted, loadAllStickers]);

  // 스크롤 이벤트 감지하여 날짜에 상대적인 스티커 위치 업데이트
  useEffect(() => {
    if (!isExpanded || !isMounted) return;

    const updateStickerPositions = () => {
      if (!containerRef.current) return;
      
      setStickers((prev) => {
        return prev.map((sticker) => {
          if (sticker.date && sticker.dayOffsetX !== undefined && sticker.dayOffsetY !== undefined) {
            // 날짜 셀 찾기
            const dayElement = document.querySelector(`[data-date="${sticker.date}"]`);
            if (dayElement) {
              const dayRect = dayElement.getBoundingClientRect();
              const containerRect = containerRef.current?.getBoundingClientRect();
              if (containerRect) {
                const positionX = (dayRect.left - containerRect.left) + (sticker.dayOffsetX || 0);
                const positionY = (dayRect.top - containerRect.top) + (sticker.dayOffsetY || 0);
                return { ...sticker, positionX, positionY };
              }
            }
          }
          return sticker;
        });
      });
    };

    // 초기 위치 업데이트 (약간의 지연을 두어 DOM이 완전히 렌더링된 후 실행)
    const timer = setTimeout(() => {
      updateStickerPositions();
    }, 200);

    // 스크롤 컨테이너 찾기
    const calendarDays = document.querySelector('.calendar-days');
    const mainContent = document.querySelector('.main-content');
    const appLayout = document.querySelector('.app-layout');
    const app = document.querySelector('.app');
    
    // 여러 스크롤 가능한 요소에 이벤트 리스너 추가
    if (calendarDays) {
      calendarDays.addEventListener('scroll', updateStickerPositions, { passive: true });
    }
    if (mainContent) {
      mainContent.addEventListener('scroll', updateStickerPositions, { passive: true });
    }
    if (appLayout) {
      appLayout.addEventListener('scroll', updateStickerPositions, { passive: true });
    }
    if (app) {
      app.addEventListener('scroll', updateStickerPositions, { passive: true });
    }
    window.addEventListener('scroll', updateStickerPositions, { passive: true });
    window.addEventListener('resize', updateStickerPositions);

    // 주기적으로 위치 업데이트 (스크롤 이벤트가 제대로 감지되지 않을 경우 대비)
    const intervalId = setInterval(updateStickerPositions, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
      if (calendarDays) {
        calendarDays.removeEventListener('scroll', updateStickerPositions);
      }
      if (mainContent) {
        mainContent.removeEventListener('scroll', updateStickerPositions);
      }
      if (appLayout) {
        appLayout.removeEventListener('scroll', updateStickerPositions);
      }
      if (app) {
        app.removeEventListener('scroll', updateStickerPositions);
      }
      window.removeEventListener('scroll', updateStickerPositions);
      window.removeEventListener('resize', updateStickerPositions);
    };
  }, [isExpanded, isMounted, stickers]);

  useEffect(() => {
    if (!isExpanded || !isMounted) {
      return;
    }

    // 이벤트 리스너 등록
    const handleAddSticker = async (e: CustomEvent) => {
      try {
        const file = e.detail as File;
        if (!file) {
          console.warn('No file selected');
          return;
        }

        const reader = new FileReader();
        reader.onerror = (error) => {
          console.error('FileReader error:', error);
        };
        
        reader.onloadend = async () => {
          try {
            const imagePath = reader.result as string;
            if (!imagePath) {
              console.error('Failed to read file');
              return;
            }

            const img = new Image();
            img.onerror = (error) => {
              console.error('Image load error:', error);
            };
            
            img.onload = async () => {
              try {
                const width = Math.min(img.width, 80);
                const height = (img.height / img.width) * width;
                
                // 캘린더 컨테이너 기준으로 중앙 배치
                let positionX = 200;
                let positionY = 200;
                
                if (containerRef.current) {
                  const containerRect = containerRef.current.getBoundingClientRect();
                  // 컨테이너 중앙 계산
                  positionX = (containerRect.width / 2) - (width / 2);
                  positionY = (containerRect.height / 2) - (height / 2);
                  
                  // 컨테이너 내부로 제한 (배너 위까지 허용)
                  positionX = Math.max(-50, Math.min(positionX, containerRect.width - width + 50));
                  positionY = Math.max(-254, Math.min(positionY, containerRect.height - height + 50));
                }
                
                if (window.electronAPI) {
                  const today = new Date();
                  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  
                  const result = await window.electronAPI.dbSaveSticker(
                    date,
                    imagePath,
                    positionX,
                    positionY,
                    width,
                    height,
                    false
                  );
                  console.log('Sticker save result:', result);
                  if (result && result.success) {
                    // 스티커를 즉시 상태에 추가
                    const newSticker: Sticker = {
                      id: result.id,
                      imagePath,
                      positionX,
                      positionY,
                      width,
                      height,
                      date,
                      dayOffsetX,
                      dayOffsetY,
                    };
                    console.log('Adding sticker to state:', newSticker);
                    setStickers((prev) => {
                      const updated = [...prev, newSticker];
                      console.log('Updated stickers:', updated);
                      if (onStickersChange) {
                        onStickersChange(updated);
                      }
                      return updated;
                    });
                    // 데이터베이스에서도 다시 불러오기
                    setTimeout(() => {
                      loadAllStickers();
                    }, 100);
                  } else {
                    console.error('Failed to save sticker - result:', result);
                    alert('스티커 저장에 실패했습니다.');
                  }
                } else {
                  console.warn('window.electronAPI is not available, using local storage fallback');
                  // Electron API가 없을 때는 로컬 스토리지에 저장
                  const newSticker: Sticker = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    imagePath,
                    positionX,
                    positionY,
                    width,
                    height,
                    date,
                    dayOffsetX,
                    dayOffsetY,
                  };
                  setStickers((prev) => {
                    const updated = [...prev, newSticker];
                    if (onStickersChange) {
                      onStickersChange(updated);
                    }
                    return updated;
                  });
                  // 로컬 스토리지에 저장 (탭별로 구분)
                  try {
                    const storageKey = `stickers-${tabKey}`;
                    const existingStickers = localStorage.getItem(storageKey);
                    const stickers = existingStickers ? JSON.parse(existingStickers) : [];
                    stickers.push(newSticker);
                    localStorage.setItem(storageKey, JSON.stringify(stickers));
                  } catch (error) {
                    console.error('Failed to save sticker to local storage:', error);
                  }
                }
              } catch (error) {
                console.error('Failed to process sticker:', error);
                alert('스티커 처리 중 오류가 발생했습니다.');
              }
            };
            img.src = imagePath;
          } catch (error) {
            console.error('Failed to process file:', error);
            alert('파일 처리 중 오류가 발생했습니다.');
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error('Failed to handle add sticker:', error);
        alert('스티커 추가 중 오류가 발생했습니다.');
      }
    };

    const handleToggleDeleteMode = () => {
      setIsDeleteMode((prev) => !prev);
      setSelectedStickerId(null);
    };

    const handleLockChanged = (e: CustomEvent) => {
      setIsLocked(e.detail);
    };

    window.addEventListener('add-sticker', handleAddSticker as EventListener);
    window.addEventListener('toggle-delete-mode', handleToggleDeleteMode);
    window.addEventListener('sticker-lock-changed', handleLockChanged as EventListener);

    return () => {
      try {
        window.removeEventListener('add-sticker', handleAddSticker as EventListener);
        window.removeEventListener('toggle-delete-mode', handleToggleDeleteMode);
        window.removeEventListener('sticker-lock-changed', handleLockChanged as EventListener);
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [isExpanded, isMounted, loadAllStickers]);

  // requestAnimationFrame으로 최적화된 전역 마우스 이벤트 핸들러 (먼저 정의)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isLocked) return;

    // 이전 pending 업데이트를 새 이벤트로 덮어쓰기
    pendingUpdateRef.current = { type: 'drag', data: e };

    // 이미 requestAnimationFrame이 예약되어 있으면 취소
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    // requestAnimationFrame으로 상태 업데이트 예약
    rafIdRef.current = requestAnimationFrame(() => {
      const update = pendingUpdateRef.current;
      if (!update) return;

      const e = update.data as MouseEvent;
      const currentDraggingId = draggingIdRef.current;
      const currentResizingId = resizingIdRef.current;
      const currentRotatingId = rotatingIdRef.current;
      const currentStickers = stickersRef.current;
      const currentDragOffset = dragOffsetRef.current;
      const currentResizeStart = resizeStartRef.current;
      const currentRotateStart = rotateStartRef.current;

      if (currentDraggingId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left - currentDragOffset.x;
        const newY = e.clientY - rect.top - currentDragOffset.y;

        // calendar-days 영역 찾기
        const calendarDays = document.querySelector('.calendar-days');
        if (!calendarDays) return;
        
        const daysRect = calendarDays.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;
        
        const daysTop = daysRect.top - containerRect.top;
        const daysLeft = daysRect.left - containerRect.left;
        const daysWidth = daysRect.width;
        const daysHeight = daysRect.height;

        const updated = currentStickers.map((sticker) => {
          if (sticker.id === currentDraggingId) {
            const minY = daysTop;
            const maxY = daysTop + daysHeight - sticker.height;
            const minX = daysLeft;
            const maxX = daysLeft + daysWidth - sticker.width;
            
            const dayElements = document.querySelectorAll('.calendar-day:not(.empty)');
            let closestDay: Element | null = null;
            let minDistance = Infinity;
            
            dayElements.forEach((dayEl) => {
              const dayRect = dayEl.getBoundingClientRect();
              const dayCenterX = dayRect.left + dayRect.width / 2;
              const dayCenterY = dayRect.top + dayRect.height / 2;
              const stickerCenterX = rect.left + newX + sticker.width / 2;
              const stickerCenterY = rect.top + newY + sticker.height / 2;
              const distance = Math.sqrt(
                Math.pow(dayCenterX - stickerCenterX, 2) + Math.pow(dayCenterY - stickerCenterY, 2)
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestDay = dayEl;
              }
            });
            
            let date = sticker.date;
            let dayOffsetX = sticker.dayOffsetX;
            let dayOffsetY = sticker.dayOffsetY;
            
            if (closestDay) {
              const dayDate = closestDay.getAttribute('data-date');
              if (dayDate) {
                date = dayDate;
                const dayRect = closestDay.getBoundingClientRect();
                dayOffsetX = newX - (dayRect.left - rect.left);
                dayOffsetY = newY - (dayRect.top - rect.top);
              }
            }
            
            return {
              ...sticker,
              positionX: Math.max(minX, Math.min(maxX, newX)),
              positionY: Math.max(minY, Math.min(maxY, newY)),
              date,
              dayOffsetX,
              dayOffsetY,
            };
          }
          return sticker;
        });
        
        setStickers(updated);
        if (onStickersChange) {
          onStickersChange(updated);
        }
      } else if (currentResizingId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const deltaX = e.clientX - currentResizeStart.x;
        const deltaY = e.clientY - currentResizeStart.y;
        const delta = Math.max(deltaX, deltaY);
        const newWidth = Math.max(30, Math.min(currentResizeStart.width + delta, 300));
        const newHeight = Math.max(30, Math.min(currentResizeStart.height + delta, 300));

        const updated = currentStickers.map((sticker) =>
          sticker.id === currentResizingId
            ? { ...sticker, width: newWidth, height: newHeight }
            : sticker
        );
        
        setStickers(updated);
        if (onStickersChange) {
          onStickersChange(updated);
        }
      } else if (currentRotatingId && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const currentAngle = (Math.atan2(mouseY - currentRotateStart.centerY, mouseX - currentRotateStart.centerX) * 180) / Math.PI;
        const newRotation = currentAngle - currentRotateStart.angle;

        const updated = currentStickers.map((sticker) =>
          sticker.id === currentRotatingId
            ? { ...sticker, rotation: newRotation }
            : sticker
        );
        
        setStickers(updated);
        if (onStickersChange) {
          onStickersChange(updated);
        }
      }

      pendingUpdateRef.current = null;
      rafIdRef.current = null;
    });
  }, [isLocked, onStickersChange]);

  // 전역 mouseup 핸들러
  const handleGlobalMouseUp = useCallback(async () => {
    // 이벤트 리스너 제거 (ref를 통해)
    if (handleGlobalMouseMoveRef.current) {
      window.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }

    // pending 업데이트 취소
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const currentDraggingId = draggingIdRef.current;
    const currentResizingId = resizingIdRef.current;
    const currentRotatingId = rotatingIdRef.current;
    const currentStickers = stickersRef.current;

    if (currentDraggingId || currentResizingId || currentRotatingId) {
      const stickerId = currentDraggingId || currentResizingId || currentRotatingId;
      const sticker = currentStickers.find(s => s.id === stickerId);
      if (sticker && window.electronAPI) {
        try {
          const today = new Date();
          const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          
          await window.electronAPI.dbUpdateSticker(
            stickerId!,
            sticker.positionX,
            sticker.positionY
          );
          if (onStickerUpdate) {
            onStickerUpdate(stickerId!, sticker.positionX, sticker.positionY);
          }
        } catch (error) {
          console.error('Failed to update sticker:', error);
        }
      }
    }

    setDraggingId(null);
    setResizingId(null);
    setRotatingId(null);
  }, [onStickerUpdate]);

  // ref에 함수 참조 저장
  useEffect(() => {
    handleGlobalMouseMoveRef.current = handleGlobalMouseMove;
    handleGlobalMouseUpRef.current = handleGlobalMouseUp;
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleResizeStart = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sticker = stickersRef.current.find(s => s.id === stickerId);
    if (!sticker) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setResizingId(stickerId);
    setSelectedSticker(stickerId);
    const resizeStartData = {
      x: e.clientX,
      y: e.clientY,
      width: sticker.width,
      height: sticker.height,
    };
    setResizeStart(resizeStartData);
    resizeStartRef.current = resizeStartData;

    // window에 이벤트 리스너 추가 (마우스가 핸들에서 벗어나도 계속 추적)
    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  const handleRotateStart = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sticker = stickersRef.current.find(s => s.id === stickerId);
    if (!sticker) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = sticker.positionX + sticker.width / 2;
    const centerY = sticker.positionY + sticker.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const startAngle = (Math.atan2(mouseY - centerY, mouseX - centerX) * 180) / Math.PI - (sticker.rotation || 0);

    setRotatingId(stickerId);
    setSelectedSticker(stickerId);
    const rotateStartData = {
      angle: startAngle,
      centerX,
      centerY,
    };
    setRotateStart(rotateStartData);
    rotateStartRef.current = rotateStartData;

    // window에 이벤트 리스너 추가
    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  const handleMouseDown = (e: React.MouseEvent, stickerId: string) => {
    if (isLocked) {
      return;
    }

    if (isDeleteMode) {
      e.preventDefault();
      e.stopPropagation();
      setSelectedStickerId(stickerId);
      return;
    }

    // 편집 모드가 아니면 선택만
    if (!isEditMode) {
      setSelectedSticker(stickerId);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    const sticker = stickersRef.current.find(s => s.id === stickerId);
    if (!sticker) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingId(stickerId);
    setSelectedSticker(stickerId);
    const dragOffsetData = {
      x: e.clientX - rect.left - sticker.positionX,
      y: e.clientY - rect.top - sticker.positionY,
    };
    setDragOffset(dragOffsetData);
    dragOffsetRef.current = dragOffsetData;

    // window에 이벤트 리스너 추가 (마우스가 스티커에서 벗어나도 계속 추적)
    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  // 로컬 마우스 이동 이벤트 (기존 유지, 호환성)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (handleGlobalMouseMoveRef.current) {
      handleGlobalMouseMoveRef.current(e.nativeEvent);
    }
  };

  const handleMouseUp = async () => {
    // handleGlobalMouseUp이 이미 처리함 (window 이벤트 리스너)
    if (handleGlobalMouseUpRef.current) {
      handleGlobalMouseUpRef.current();
    }
  };

  const handleDeleteClick = (stickerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(stickerId);
  };

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) return;

    const deletedId = showDeleteConfirm;

    // 1. 즉시 상태에서 삭제 (낙관적 업데이트)
    const updatedStickers = stickers.filter((s) => s.id !== deletedId);
    setStickers(updatedStickers);
    
    // 2. 부모 컴포넌트에도 즉시 전달하여 외부 상태 업데이트
    if (onStickersChange) {
      onStickersChange(updatedStickers);
    }

    // 3. 선택된 스티커 상태 초기화
    setShowDeleteConfirm(null);
    setSelectedStickerId(null);
    setSelectedSticker(null);

    // 4. 비동기 삭제 작업 수행 (DB에서 실제 삭제)
    try {
      if (window.electronAPI && window.electronAPI.dbDeleteSticker) {
        const result = await window.electronAPI.dbDeleteSticker(deletedId);
        // 삭제 성공 확인
        if (result && result.success !== false) {
          if (onStickerDelete) {
            onStickerDelete(deletedId);
          }
          // 삭제 성공 시 재로드하지 않음 (이미 UI에서 제거됨)
          // 다만 다른 탭에서 같은 데이터를 보고 있을 수 있으므로 reloadStickers만 호출
          if (window.electronAPI && window.electronAPI.reloadStickers) {
            try {
              await window.electronAPI.reloadStickers();
            } catch (error) {
              console.warn('Failed to send reload-stickers message:', error);
            }
          }
        } else {
          // 삭제 실패 시 원래대로 복구
          console.warn('Sticker delete failed, restoring sticker');
          if (isExpanded && isMounted) {
            loadAllStickers();
          }
        }
      } else {
        // 로컬 스토리지에서 삭제
        try {
          const storageKey = `stickers-${tabKey}`;
          const existingStickers = localStorage.getItem(storageKey);
          if (existingStickers) {
            const allStickers = JSON.parse(existingStickers);
            const filtered = allStickers.filter((s: Sticker) => s.id !== deletedId);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
          }
          if (onStickerDelete) {
            onStickerDelete(deletedId);
          }
        } catch (error) {
          console.error('Failed to delete sticker from local storage:', error);
          // 실패 시 원래대로 복구
          if (isExpanded && isMounted) {
            loadAllStickers();
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete sticker:', error);
      // 에러 발생 시 원래대로 복구
      if (isExpanded && isMounted) {
        loadAllStickers();
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
    setSelectedStickerId(null);
  };

  if (!isExpanded || !isMounted) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="calendar-sticker-container"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {stickers.map((sticker) => (
          <div
            key={`sticker-${sticker.id}`}
            className={`calendar-sticker ${isLocked ? 'locked' : ''} ${draggingId === sticker.id ? 'dragging' : ''} ${isDeleteMode && selectedStickerId === sticker.id ? 'selected-for-delete' : ''}`}
            style={{
              left: `${sticker.positionX}px`,
              top: `${sticker.positionY}px`,
              width: `${sticker.width}px`,
              height: `${sticker.height}px`,
              transform: `rotate(${sticker.rotation || 0}deg)`,
              zIndex: sticker.zIndex || 10001,
            }}
            onMouseDown={(e) => handleMouseDown(e, sticker.id)}
          >
            <img src={sticker.imagePath} alt="Sticker" />
            {isEditMode && selectedSticker === sticker.id && (
              <>
                <div
                  className="sticker-resize-handle"
                  onMouseDown={(e) => handleResizeStart(e, sticker.id)}
                  title="크기 조정"
                />
                <div
                  className="sticker-rotate-handle"
                  onMouseDown={(e) => handleRotateStart(e, sticker.id)}
                  title="회전"
                />
                <div
                  className="sticker-delete-handle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteClick(sticker.id, e);
                  }}
                  title="삭제"
                >
                  ×
                </div>
              </>
            )}
            {isDeleteMode && selectedStickerId === sticker.id && (
              <div 
                className="sticker-delete-mark"
                onClick={(e) => handleDeleteClick(sticker.id, e)}
              >
                ×
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={handleCancelDelete}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>스티커 삭제</h3>
            <p>이 스티커를 정말 삭제할까요?</p>
            <div className="delete-confirm-actions">
              <button className="btn btn-secondary" onClick={handleCancelDelete}>
                취소
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 스티커 관리 상태 표시 */}
      {isDeleteMode && (
        <div className="sticker-status-panel">
          <div className="sticker-status-item">
            <span>제거 모드 활성화</span>
            <button
              className="sticker-status-btn"
              onClick={() => {
                setIsDeleteMode(false);
                setSelectedStickerId(null);
              }}
            >
              종료
            </button>
          </div>
        </div>
      )}

    </>
  );
}
