import React, { useState, useRef } from 'react';
import { Sticker, StickerLayout } from '../types';
import { useStickerStore } from '../store/stickerStore';
import { Upload, Save, RotateCcw, Image as ImageIcon } from 'lucide-react';
import './FloatingToolbar.css';

interface FloatingToolbarProps {
  stickers: Sticker[];
  onSaveLayout: (layout: StickerLayout) => void;
  onCancel: () => void;
  onAddSticker: (file: File) => void;
  uploadedStickers: Array<{ id: string; image: string; name: string }>;
  onRemoveUploadedSticker: (id: string) => void;
  onAddStickerToCanvas: (imageUrl: string, name: string) => void;
  onApplyLayout?: (layout: StickerLayout) => void;
}

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  stickers,
  onSaveLayout,
  onCancel,
  onAddSticker,
  uploadedStickers,
  onRemoveUploadedSticker,
  onAddStickerToCanvas,
  onApplyLayout,
}) => {
  // 🚨 스토어에서 현재 탭의 스티커 가져오기
  const { currentTabId, getStickers } = useStickerStore();
  const currentTabStickers = getStickers(currentTabId);
  
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentResolution = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleMultipleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        onAddSticker(file);
      }
    });
  };

  const handleSaveAndCompleteClick = () => {
    // 🚨 탭별 기본 레이아웃 이름 생성
    const tabNameMap: Record<string, string> = {
      'Matrix': '매트릭스',
      'Category': '카테고리',
      'Calendar': '캘린더',
      'Record': '레코드',
      'Daily Focus': '데일리 포커스',
    };
    const tabName = tabNameMap[currentTabId] || '레이아웃';
    setLayoutName(`${tabName}_레이아웃`);
    setShowSaveDialog(true);
  };

  const saveAndComplete = () => {
    if (!layoutName.trim()) return;

    const currentResolution = getCurrentResolution();

    // 🚨 스토어에서 현재 탭의 스티커 가져오기 (탭별 분리)
    const newLayout: StickerLayout = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: layoutName.trim(),
      resolution: currentResolution,
      stickers: [...currentTabStickers], // 현재 탭의 스티커만 사용
      savedAt: new Date(),
    };

    onSaveLayout(newLayout);
    setShowSaveDialog(false);
    setLayoutName('');
    setShowSaveSuccess(true);
    
    // 저장 직후 바로 저장한 레이아웃을 불러오기
    if (onApplyLayout) {
      // 약간의 지연을 두어 저장이 완료된 후 적용
      setTimeout(() => {
        onApplyLayout(newLayout);
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000);
      }, 100);
    } else {
      setTimeout(() => {
        setShowSaveSuccess(false);
      }, 2000);
    }
  };

  const cancelSave = () => {
    setShowSaveDialog(false);
    setLayoutName('');
  };

  return (
    <>
      <div className="floating-toolbar">
        <div className="toolbar-content">
          <button
            className="tool-button"
            onClick={() => setShowUploadPanel(!showUploadPanel)}
            title="스티커 업로드"
          >
            <Upload size={16} color="var(--text-primary)" />
            업로드
          </button>

          <button
            className="save-complete-button"
            onClick={handleSaveAndCompleteClick}
            title="레이아웃 저장 후 꾸미기 완료"
          >
            <Save size={16} color="var(--text-primary)" />
            저장 후 완료
          </button>

          <button
            className="cancel-button"
            onClick={onCancel}
            title="꾸미기 취소 (이전 상태로 되돌리기)"
          >
            <RotateCcw size={16} color="var(--text-primary)" />
            취소
          </button>
        </div>
      </div>

      {showUploadPanel && (
        <div className="upload-panel">
          <div className="upload-header">
            <h4>스티커 업로드</h4>
            <button
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={16} color="var(--text-primary)" />
              이미지 선택 (다중)
            </button>
          </div>

          <div className="sticker-grid">
            {uploadedStickers.length === 0 ? (
              <div className="empty-state">
                <ImageIcon size={16} color="var(--text-primary)" />
                <p>업로드된 스티커가 없습니다</p>
              </div>
            ) : (
              uploadedStickers.map((template) => (
                <div key={template.id} className="sticker-item">
                  <div
                    className="sticker-preview"
                    style={{ backgroundImage: `url(${template.image})` }}
                    title="캔버스에 추가하려면 클릭"
                    onClick={() => onAddStickerToCanvas(template.image, template.name)}
                  />
                  <div className="sticker-info">
                    <span className="sticker-name">
                      {template.name.length > 12
                        ? `${template.name.slice(0, 12)}...`
                        : template.name}
                    </span>
                    <button
                      className="remove-button"
                      onClick={() => onRemoveUploadedSticker(template.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleMultipleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      )}

            {showSaveDialog && (
              <div className="save-dialog">
                <div className="save-dialog-content">
                  <h4>레이아웃을 저장할까요?</h4>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: '16px' }}>
                    현재 보고 있는 탭의 레이아웃이 저장됩니다.
                  </p>
            <div className="input-group">
              <label htmlFor="layoutName">레이아웃 이름</label>
              <input
                id="layoutName"
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="레이아웃 이름을 입력하세요"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    saveAndComplete();
                  } else if (e.key === 'Escape') {
                    cancelSave();
                  }
                }}
              />
            </div>
            <div className="dialog-actions">
              <button className="cancel-button" onClick={cancelSave}>
                취소
              </button>
              <button
                className="confirm-button"
                onClick={saveAndComplete}
                disabled={!layoutName.trim()}
              >
                저장 후 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 레이아웃 저장 성공 모달 */}
      {showSaveSuccess && (
        <div className="modal-overlay" onClick={() => setShowSaveSuccess(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>레이아웃 저장 완료</h3>
            <p>레이아웃이 저장되었습니다!</p>
            <div className="modal-actions">
              <button className="modal-confirm" onClick={() => setShowSaveSuccess(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingToolbar;

