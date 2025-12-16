import React, { useState, useEffect, useRef } from 'react';
import { Sticker, StickerLayout } from '../types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Brush, Flag, Sticker as StickerIcon, LayoutTemplate, Settings } from 'lucide-react';
import HeaderImageEditor from './HeaderImageEditor';
import ThemeSelector from './ThemeSelector';
import { useStickerStore } from '../store/stickerStore';
import './StylingManager.css';

interface StylingManagerProps {
  stickers: Sticker[];
  onStickersChange: (stickers: Sticker[]) => void;
  onClose: () => void;
  isEditMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  onSaveLayout?: (layout: StickerLayout) => void;
  onApplyLayout?: (layout: StickerLayout) => void;
  onDeleteLayout?: (layoutId: string) => void;
  onHeaderImageSave?: (imagePath: string) => void;
}

type TabType = 'theme' | 'header' | 'sticker' | 'layout';

const StylingManager: React.FC<StylingManagerProps> = ({
  stickers,
  onStickersChange,
  onClose,
  isEditMode,
  onEditModeChange,
  onSaveLayout,
  onApplyLayout,
  onDeleteLayout,
  onHeaderImageSave,
}) => {
  // 현재 탭의 스티커 개수 가져오기
  const { currentTabId, stickersByTab, updateStickers, setStickers } = useStickerStore();
  const currentTabStickers = stickersByTab[currentTabId] || [];
  const stickerCount = currentTabStickers.length;

  const [activeTab, setActiveTab] = useState<TabType>('sticker');
  const [stickerLayouts, setStickerLayouts] = useState<StickerLayout[]>([]);
  const [layoutMenuId, setLayoutMenuId] = useState<string | null>(null);
  const [showHeaderEditor, setShowHeaderEditor] = useState(false);
  const [headerImageSrc, setHeaderImageSrc] = useState<string | null>(null);
  const headerFileInputRef = useRef<HTMLInputElement>(null);
  const [applyLayoutConfirm, setApplyLayoutConfirm] = useState<StickerLayout | null>(null);
  const [deleteLayoutConfirm, setDeleteLayoutConfirm] = useState<string | null>(null);
  const [deleteAllStickersConfirm, setDeleteAllStickersConfirm] = useState(false);

  // 레이아웃 불러오기
  useEffect(() => {
    loadLayouts();
  }, []);

  const loadLayouts = async () => {
    try {
      if (window.electronAPI && window.electronAPI.dbGetAllStickerLayouts) {
        const result = await window.electronAPI.dbGetAllStickerLayouts();
        if (result && result.success && result.layouts && Array.isArray(result.layouts)) {
          const layouts = result.layouts;
          const parsedLayouts: StickerLayout[] = layouts.map((l: any) => ({
            id: l.id,
            name: l.name,
            resolution: {
              width: l.resolution_width,
              height: l.resolution_height,
            },
            stickers: JSON.parse(l.stickers_data || '[]'),
            savedAt: new Date(l.saved_at),
          }));
          // 저장 시간 순으로 정렬 (최신순)
          parsedLayouts.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
          setStickerLayouts(parsedLayouts);
        } else {
          console.error('Failed to load layouts:', result?.error);
        }
      } else {
        // 로컬 스토리지에서 불러오기
        const savedLayouts = localStorage.getItem('sticker-layouts');
        if (savedLayouts) {
          const layouts = JSON.parse(savedLayouts);
          const parsedLayouts = layouts.map((l: any) => ({
            ...l,
            savedAt: new Date(l.savedAt),
          }));
          parsedLayouts.sort((a: StickerLayout, b: StickerLayout) => b.savedAt.getTime() - a.savedAt.getTime());
          setStickerLayouts(parsedLayouts);
        }
      }
    } catch (error) {
      console.error('Failed to load layouts:', error);
    }
  };

  const handleApplyLayout = (layout: StickerLayout) => {
    setApplyLayoutConfirm(layout);
  };

  const applyLayout = async (layout: StickerLayout) => {
    try {
      // Electron의 창 크기 변경
      if (window.electronAPI && (window.electronAPI as any).resizeWindow) {
        await (window.electronAPI as any).resizeWindow(
          layout.resolution.width,
          layout.resolution.height
        );
      }

      // 🚨 Zustand 스토어에 직접 적용 (탭별 분리)
      setStickers(currentTabId, [...layout.stickers]);
      
      // 로컬 상태도 업데이트 (하위 호환성)
      onStickersChange([...layout.stickers]);
      setLayoutMenuId(null);
      setApplyLayoutConfirm(null);
      
      if (onApplyLayout) {
        onApplyLayout(layout);
      }
    } catch (error) {
      console.error('Failed to resize window:', error);
      alert('해상도 변경에 실패했습니다.');
    }
  };

  const handleDeleteLayout = (layoutId: string) => {
    setDeleteLayoutConfirm(layoutId);
  };

  const deleteLayout = async (layoutId: string) => {
    if (!deleteLayoutConfirm) return;
    const layout = stickerLayouts.find((l) => l.id === deleteLayoutConfirm);
    if (layout) {
      try {
        if (window.electronAPI && window.electronAPI.dbDeleteStickerLayout) {
          const result = await window.electronAPI.dbDeleteStickerLayout(layoutId);
          if (!result || !result.success) {
            throw new Error(result?.error || 'Unknown error during deletion');
          }
        } else {
          // 로컬 스토리지에서 삭제
          const savedLayouts = localStorage.getItem('sticker-layouts');
          if (savedLayouts) {
            const layouts = JSON.parse(savedLayouts);
            const filtered = layouts.filter((l: any) => l.id !== layoutId);
            localStorage.setItem('sticker-layouts', JSON.stringify(filtered));
          }
        }
        setStickerLayouts((prev) => prev.filter((l) => l.id !== deleteLayoutConfirm));
        setLayoutMenuId(null);
        setDeleteLayoutConfirm(null);
        
        if (onDeleteLayout) {
          onDeleteLayout(deleteLayoutConfirm);
        }
      } catch (error: any) {
        console.error('❌ Failed to delete layout:', error);
        console.error('Layout ID:', layoutId);
        alert(`레이아웃 삭제에 실패했습니다: ${error?.message || String(error)}`);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleHeaderImageSave = (imagePath: string) => {
    setShowHeaderEditor(false);
    if (onHeaderImageSave) {
      onHeaderImageSave(imagePath);
    }
  };

  return (
    <>
      <div className="styling-manager-overlay" onClick={handleBackdropClick}>
        <div className="styling-manager-panel" onClick={(e) => e.stopPropagation()}>
          <div className="styling-manager-header">
            <h2 className="styling-manager-title">스타일 관리</h2>
            <button className="styling-manager-close-button" onClick={onClose}>
              ×
            </button>
          </div>

          {/* 탭 메뉴 */}
          <div className="styling-manager-tabs">
            <button
              className={`styling-tab ${activeTab === 'theme' ? 'active' : ''}`}
              onClick={() => setActiveTab('theme')}
            >
              <Brush size={16} color="var(--text-primary)" /> 테마
            </button>
            <button
              className={`styling-tab ${activeTab === 'header' ? 'active' : ''}`}
              onClick={() => setActiveTab('header')}
            >
              <Flag size={16} color="var(--text-primary)" /> 헤더
            </button>
            <button
              className={`styling-tab ${activeTab === 'sticker' ? 'active' : ''}`}
              onClick={() => setActiveTab('sticker')}
            >
              <StickerIcon size={16} color="var(--text-primary)" /> 스티커
            </button>
            <button
              className={`styling-tab ${activeTab === 'layout' ? 'active' : ''}`}
              onClick={() => setActiveTab('layout')}
            >
              <LayoutTemplate size={16} color="var(--text-primary)" /> 레이아웃
            </button>
          </div>

          <div className="styling-manager-content">
            {/* 테마 탭 */}
            {activeTab === 'theme' && (
              <div className="styling-manager-section">
                <ThemeSelector />
              </div>
            )}

            {/* 헤더 탭 */}
            {activeTab === 'header' && (
              <div className="styling-manager-section">
                <input
                  type="file"
                  accept="image/*"
                  ref={headerFileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // 파일 크기 제한 (10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        alert('이미지 크기는 10MB 이하여야 합니다.');
                        e.target.value = ''; // 파일 입력 리셋
                        return;
                      }

                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (reader.result && typeof reader.result === 'string') {
                          setHeaderImageSrc(reader.result);
                          setShowHeaderEditor(true);
                        } else {
                          alert('이미지를 읽는 중 오류가 발생했습니다.');
                        }
                      };
                      reader.onerror = () => {
                        console.error('Failed to read file:', reader.error);
                        alert('이미지를 읽는 중 오류가 발생했습니다.');
                        e.target.value = ''; // 파일 입력 리셋
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button
                  className="header-edit-button"
                  onClick={() => {
                    headerFileInputRef.current?.click();
                  }}
                >
                  이미지 업로드 및 크롭
                </button>
                <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  헤더 비율 (16:3)에 맞게 이미지를 자를 수 있습니다.
                </p>
              </div>
            )}

            {/* 스티커 탭 */}
            {activeTab === 'sticker' && (
              <div className="styling-manager-section">
                <div className="section-header">
                  <h3>캔버스 관리</h3>
                  <button
                    className={`edit-mode-toggle ${isEditMode ? 'active' : ''}`}
                    onClick={() => onEditModeChange(!isEditMode)}
                    title={isEditMode ? '편집 모드 끄기' : '편집 모드 켜기'}
                  >
                    {isEditMode ? '✕' : '✎'}
                    {isEditMode ? '편집 종료' : '편집 시작'}
                  </button>
                </div>

                <p>현재 캔버스에 {stickerCount}개의 스티커가 배치되어 있습니다.</p>

                {!isEditMode && (
                  <p className="hint">편집 시작을 누르면 하단에 툴바가 나타납니다.</p>
                )}

                <div className="canvas-actions">
                  <button
                    className="clear-all-button"
                    onClick={() => setDeleteAllStickersConfirm(true)}
                    disabled={stickerCount === 0}
                  >
                    전체 삭제
                  </button>
                </div>
              </div>
            )}

            {/* 레이아웃 탭 */}
            {activeTab === 'layout' && (
              <div className="styling-manager-section">
                <div className="section-header">
                  <h3>저장된 레이아웃</h3>
                </div>

                {stickerLayouts.length === 0 ? (
                  <div className="empty-layouts">
                    <p>저장된 레이아웃이 없습니다.</p>
                    <p className="hint">스티커 편집 모드에서 "저장 후 완료" 버튼을 눌러 레이아웃을 저장할 수 있습니다.</p>
                  </div>
                ) : (
                  <div className="layouts-list">
                    {stickerLayouts.map((layout) => (
                      <div key={layout.id} className="layout-item">
                        <div className="layout-info">
                          <div className="layout-name">{layout.name}</div>
                          <div className="layout-meta">
                            <span className="sticker-count">스티커 {layout.stickers.length}개</span>
                            <span className="resolution">
                              {layout.resolution.width} × {layout.resolution.height}
                            </span>
                            <span className="save-date">
                              {format(layout.savedAt, 'MM/dd HH:mm', { locale: ko })}
                            </span>
                          </div>
                        </div>
                        <div className="layout-actions">
                          <button
                            className="apply-button"
                            onClick={() => handleApplyLayout(layout)}
                            title="이 레이아웃 적용"
                          >
                            ↻ 적용
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => handleDeleteLayout(layout.id)}
                            title="레이아웃 삭제"
                          >
                            🗑️ 삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showHeaderEditor && (
        <HeaderImageEditor
          onClose={() => {
            setShowHeaderEditor(false);
            setHeaderImageSrc(null);
          }}
          onSave={(imagePath) => {
            handleHeaderImageSave(imagePath);
            setShowHeaderEditor(false);
            setHeaderImageSrc(null);
          }}
          initialImageSrc={headerImageSrc}
        />
      )}

      {/* 스티커 전체 삭제 확인 모달 */}
      {deleteAllStickersConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteAllStickersConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>스티커 전체 삭제</h3>
            <p>모든 스티커를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteAllStickersConfirm(false)}>
                취소
              </button>
              <button className="modal-confirm" onClick={() => {
                // 🚨 스토어에서 현재 탭의 스티커만 삭제
                updateStickers(currentTabId, []);
                // 로컬 상태도 업데이트
                onStickersChange([]);
                setDeleteAllStickersConfirm(false);
              }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 레이아웃 삭제 확인 모달 */}
      {deleteLayoutConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteLayoutConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>레이아웃 삭제</h3>
            <p>"{stickerLayouts.find(l => l.id === deleteLayoutConfirm)?.name}" 레이아웃을 삭제하시겠습니까?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteLayoutConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={() => deleteLayout(deleteLayoutConfirm)}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 레이아웃 적용 확인 모달 */}
      {applyLayoutConfirm && (
        <div className="modal-overlay" onClick={() => setApplyLayoutConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>레이아웃 적용</h3>
            <p>"{applyLayoutConfirm.name}" 레이아웃을 적용하시겠습니까?<br />현재 스티커들은 사라지고, 해상도가 {applyLayoutConfirm.resolution.width}×{applyLayoutConfirm.resolution.height}으로 변경됩니다.</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setApplyLayoutConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={() => applyLayout(applyLayoutConfirm)}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StylingManager;
