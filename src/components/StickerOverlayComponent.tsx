import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStickerStore } from '../store/stickerStore';
import { Sticker } from '../types';
import './StickerOverlayComponent.css';

interface StickerOverlayComponentProps {
  isEditMode?: boolean;
  onDeleteSticker?: (id: string) => void;
}

export default function StickerOverlayComponent({ 
  isEditMode = false,
  onDeleteSticker,
}: StickerOverlayComponentProps) {
  const { 
    currentTabId, 
    stickersByTab, 
    updateStickers,
    deleteSticker,
    selectedStickerId,
    setSelectedStickerId,
    isDragging,
    isResizing,
    isRotating,
    draggingId,
    resizingId,
    rotatingId,
    startDragging,
    stopDragging,
    startResizing,
    stopResizing,
    startRotating,
    stopRotating,
  } = useStickerStore();
  
  // 현재 탭의 스티커만 가져오기
  const currentStickers = stickersByTab[currentTabId] || [];
  
  // 이미지 URL 캐시 (file:// 경로를 base64로 변환한 결과)
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [deleteStickerConfirm, setDeleteStickerConfirm] = useState<string | null>(null);
  
  // file:// 경로를 base64로 변환하는 함수
  const loadImageAsDataUrl = useCallback(async (imagePath: string): Promise<string> => {
    // 이미 캐시에 있으면 반환
    if (imageCache[imagePath]) {
      return imageCache[imagePath];
    }
    
    // file:// 프로토콜이 있거나 절대 경로인 경우 IPC로 로드
    if (imagePath.startsWith('file://') || /^[A-Za-z]:\\/.test(imagePath) || imagePath.startsWith('/')) {
      if (window.electronAPI && window.electronAPI.loadStickerImage) {
        try {
          const result = await window.electronAPI.loadStickerImage(imagePath);
          if (result && result.success && result.dataUrl) {
            // 캐시에 저장
            setImageCache(prev => ({ ...prev, [imagePath]: result.dataUrl! }));
            return result.dataUrl;
          }
        } catch (error) {
          console.error('Failed to load image:', error);
        }
      }
      // 로드 실패 시 원본 경로 반환 (fallback)
      return imagePath;
    }
    
    // 이미 base64나 http/https URL이면 그대로 반환
    return imagePath;
  }, [imageCache]);
  
  // 각 스티커의 이미지 URL 로드
  const [loadedImageUrls, setLoadedImageUrls] = useState<Record<string, string>>({});
  
  useEffect(() => {
    // 모든 스티커의 이미지 URL 로드
    const loadImages = async () => {
      const newUrls: Record<string, string> = {};
      for (const sticker of currentStickers) {
        // 이미 로드된 URL이 없거나 경로가 변경된 경우에만 다시 로드
        const currentUrl = loadedImageUrls[sticker.id];
        if (!currentUrl || (sticker.imagePath.startsWith('file://') && !currentUrl.startsWith('data:')) || 
            (/^[A-Za-z]:\\/.test(sticker.imagePath) && !currentUrl.startsWith('data:'))) {
          const dataUrl = await loadImageAsDataUrl(sticker.imagePath);
          if (dataUrl) {
            newUrls[sticker.id] = dataUrl;
          }
        }
      }
      if (Object.keys(newUrls).length > 0) {
        setLoadedImageUrls(prev => ({ ...prev, ...newUrls }));
      }
    };
    
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStickers.length, JSON.stringify(currentStickers.map(s => ({ id: s.id, path: s.imagePath })))]);

  // 드래그/리사이즈/회전 상태 관리
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [rotateStart, setRotateStart] = useState({ angle: 0, centerX: 0, centerY: 0 });

  // requestAnimationFrame 최적화
  const rafIdRef = useRef<number | null>(null);
  const pendingUpdateRef = useRef<{ type: 'drag' | 'resize' | 'rotate'; data: any } | null>(null);
  
  // 최신 상태 참조를 위한 ref
  const stickersRef = useRef(currentStickers);
  const draggingIdRef = useRef(draggingId);
  const resizingIdRef = useRef(resizingId);
  const rotatingIdRef = useRef(rotatingId);
  const dragOffsetRef = useRef(dragOffset);
  const resizeStartRef = useRef(resizeStart);
  const rotateStartRef = useRef(rotateStart);
  const currentTabIdRef = useRef(currentTabId);

  // ref 업데이트
  useEffect(() => {
    stickersRef.current = currentStickers;
    draggingIdRef.current = draggingId;
    resizingIdRef.current = resizingId;
    rotatingIdRef.current = rotatingId;
    dragOffsetRef.current = dragOffset;
    resizeStartRef.current = resizeStart;
    rotateStartRef.current = rotateStart;
    currentTabIdRef.current = currentTabId;
  }, [currentStickers, draggingId, resizingId, rotatingId, dragOffset, resizeStart, rotateStart, currentTabId]);

  // 전역 이벤트 핸들러 ref
  const handleGlobalMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleGlobalMouseUpRef = useRef<(() => void) | null>(null);

  // 드래그 시작
  const handleDragStart = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sticker = currentStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    startDragging(stickerId);
    setSelectedStickerId(stickerId);
    const dragOffsetData = {
      x: e.clientX - sticker.positionX,
      y: e.clientY - sticker.positionY,
    };
    setDragOffset(dragOffsetData);
    dragOffsetRef.current = dragOffsetData;

    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  // 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sticker = stickersRef.current.find(s => s.id === stickerId);
    if (!sticker) return;

    startResizing(stickerId);
    setSelectedStickerId(stickerId);
    const resizeStartData = {
      x: e.clientX,
      y: e.clientY,
      width: sticker.width,
      height: sticker.height,
    };
    setResizeStart(resizeStartData);
    resizeStartRef.current = resizeStartData;

    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  // 회전 시작
  const handleRotateStart = (e: React.MouseEvent, stickerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sticker = stickersRef.current.find(s => s.id === stickerId);
    if (!sticker) return;

    const centerX = sticker.positionX + sticker.width / 2;
    const centerY = sticker.positionY + sticker.height / 2;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const startAngle = (Math.atan2(mouseY - centerY, mouseX - centerX) * 180) / Math.PI - (sticker.rotation || 0);

    startRotating(stickerId);
    setSelectedStickerId(stickerId);
    const rotateStartData = {
      angle: startAngle,
      centerX,
      centerY,
    };
    setRotateStart(rotateStartData);
    rotateStartRef.current = rotateStartData;

    if (handleGlobalMouseMoveRef.current) {
      window.addEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }
    if (handleGlobalMouseUpRef.current) {
      window.addEventListener('mouseup', handleGlobalMouseUpRef.current, { once: true });
    }
  };

  // 전역 마우스 이동 핸들러 (requestAnimationFrame 최적화)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    pendingUpdateRef.current = { type: 'drag', data: e };

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

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
      const tabId = currentTabIdRef.current;

      if (currentDraggingId) {
        const updated = currentStickers.map((sticker) => {
          if (sticker.id === currentDraggingId) {
            return {
              ...sticker,
              positionX: e.clientX - currentDragOffset.x,
              positionY: e.clientY - currentDragOffset.y,
            };
          }
          return sticker;
        });
        updateStickers(tabId, updated);
      } else if (currentResizingId) {
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
        updateStickers(tabId, updated);
      } else if (currentRotatingId) {
        const sticker = currentStickers.find(s => s.id === currentRotatingId);
        if (sticker) {
          const mouseX = e.clientX;
          const mouseY = e.clientY;
          const currentAngle = (Math.atan2(mouseY - currentRotateStart.centerY, mouseX - currentRotateStart.centerX) * 180) / Math.PI;
          const newRotation = currentAngle - currentRotateStart.angle;

          const updated = currentStickers.map((s) =>
            s.id === currentRotatingId ? { ...s, rotation: newRotation } : s
          );
          updateStickers(tabId, updated);
        }
      }

      pendingUpdateRef.current = null;
      rafIdRef.current = null;
    });
  }, [updateStickers]);

  // 전역 mouseup 핸들러
  const handleGlobalMouseUp = useCallback(() => {
    if (handleGlobalMouseMoveRef.current) {
      window.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    stopDragging();
    stopResizing();
    stopRotating();
  }, [stopDragging, stopResizing, stopRotating]);

  // ref에 함수 참조 저장
  useEffect(() => {
    handleGlobalMouseMoveRef.current = handleGlobalMouseMove;
    handleGlobalMouseUpRef.current = handleGlobalMouseUp;
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (handleGlobalMouseMoveRef.current) {
        window.removeEventListener('mousemove', handleGlobalMouseMoveRef.current);
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return (
    <div className="sticker-overlay-container">
      {currentStickers.map((sticker) => {
        const isSelected = selectedStickerId === sticker.id;
        const showHandles = isEditMode && isSelected;

        return (
          <div
            key={sticker.id}
            className={`sticker-overlay-item ${isDragging && draggingId === sticker.id ? 'dragging' : ''}`}
            style={{
              position: 'fixed',
              left: `${sticker.positionX}px`,
              top: `${sticker.positionY}px`,
              width: `${sticker.width}px`,
              height: `${sticker.height}px`,
              transform: `rotate(${sticker.rotation || 0}deg)`,
              zIndex: sticker.zIndex || 1050, /* 팝업(1100+) 아래, 헤더(100-) 위 */
              cursor: showHandles ? 'move' : 'default',
            }}
            onMouseDown={(e) => {
              if (isEditMode) {
                e.preventDefault();
                e.stopPropagation();
                setSelectedStickerId(sticker.id);
                handleDragStart(e, sticker.id);
              }
            }}
          >
            <img 
              src={loadedImageUrls[sticker.id] || sticker.imagePath} 
              alt="Sticker" 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none',
              }}
              onError={(e) => {
                // 로드 실패 시 원본 경로로 다시 시도
                if (e.currentTarget.src !== sticker.imagePath) {
                  e.currentTarget.src = sticker.imagePath;
                }
              }}
            />
            {/* 편집 모드일 때 핸들 표시 */}
            {showHandles && (
              <>
                {/* 리사이즈 핸들 */}
                <div
                  className="sticker-resize-handle"
                  onMouseDown={(e) => handleResizeStart(e, sticker.id)}
                  title="크기 조정"
                />
                {/* 회전 핸들 */}
                <div
                  className="sticker-rotate-handle"
                  onMouseDown={(e) => handleRotateStart(e, sticker.id)}
                  title="회전"
                />
                {/* 삭제 핸들 */}
                <div
                  className="sticker-delete-handle"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteStickerConfirm(sticker.id);
                  }}
                  title="삭제"
                >
                  ×
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* 스티커 삭제 확인 모달 */}
      {deleteStickerConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteStickerConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>스티커 삭제</h3>
            <p>이 스티커를 정말 삭제할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteStickerConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={() => {
                deleteSticker(currentTabId, deleteStickerConfirm);
                if (onDeleteSticker) {
                  onDeleteSticker(deleteStickerConfirm);
                }
                setSelectedStickerId(null);
                setDeleteStickerConfirm(null);
              }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

