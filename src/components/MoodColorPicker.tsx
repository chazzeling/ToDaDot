import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdClose, MdCheck, MdCancel } from 'react-icons/md';
import { HexColorPicker } from 'react-colorful';
import { isLight } from '../utils/colorUtils';
import './MoodColorPicker.css';

export interface MoodColor {
  color: string;
  name: string;
}

interface MoodColorPickerProps {
  onColorSelect: (color: string) => void;
  onSave?: (color: string) => void;
  onCancel?: () => void;
  selectedColor?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

// 원색 세트
const vibrantColors: MoodColor[] = [
  { color: '#ffccceff', name: '밝은 분홍' },
  { color: '#FFD9B3', name: '복숭아' },
  { color: '#FFF2B2', name: '노랑' },
  { color: '#b7ffcdff', name: '연두' },
  { color: '#c7c9ffff', name: '연보라' },
  { color: '#e0c6ffff', name: '라벤더' },
];

// 접근성 높은 색상 세트
const accessibleColors: MoodColor[] = [
  { color: '#E07477', name: '산호빨강' },
  { color: '#F9DAD6', name: '베이지' },
  { color: '#E0A878', name: '황토' },
  { color: '#C6E57E', name: '라임' },
  { color: '#5567E0', name: '네이비' },
  { color: '#CCAFFA', name: '라일락' },
];

// 회색 세트
const grayColors: MoodColor[] = [
  { color: '#E8E8E8', name: '옅은 회색' },
  { color: '#C0C0C0', name: '회색' },
  { color: '#A0A0A0', name: '중간 회색' },
  { color: '#707070', name: '진한 회색' },
  { color: '#505050', name: '어두운 회색' },
  { color: '#202020', name: '검정에 가까운 회색' },
];

const STORAGE_KEY = 'mood-color-names';
const CUSTOM_COLORS_STORAGE_KEY = 'mood-custom-colors';

export default function MoodColorPicker({ 
  onColorSelect,
  onSave,
  onCancel,
  selectedColor,
  selectedDate,
  onDateChange,
}: MoodColorPickerProps) {
  const [currentSelectedColor, setCurrentSelectedColor] = useState<string>(selectedColor || '');
  const [activeTab, setActiveTab] = useState<'vibrant' | 'accessible' | 'gray' | 'custom'>('vibrant');
  const [customColors, setCustomColors] = useState<MoodColor[]>(() => {
    const saved = localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          { color: '#FFB6C1', name: '커스텀 색상 1' },
          { color: '#FFD4A3', name: '커스텀 색상 2' },
          { color: '#FFF2B2', name: '커스텀 색상 3' },
          { color: '#B7FFCD', name: '커스텀 색상 4' },
          { color: '#C7C9FF', name: '커스텀 색상 5' },
          { color: '#E0C6FF', name: '커스텀 색상 6' },
        ];
      }
    }
    return [
      { color: '#FFB6C1', name: '커스텀 색상 1' },
      { color: '#FFD4A3', name: '커스텀 색상 2' },
      { color: '#FFF2B2', name: '커스텀 색상 3' },
      { color: '#B7FFCD', name: '커스텀 색상 4' },
      { color: '#C7C9FF', name: '커스텀 색상 5' },
      { color: '#E0C6FF', name: '커스텀 색상 6' },
    ];
  });
  
  // selectedColor prop이 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (selectedColor !== undefined) {
      setCurrentSelectedColor(selectedColor);
    }
  }, [selectedColor]);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [customNames, setCustomNames] = useState<Record<string, string>>({});
  const [editingCustomColorIndex, setEditingCustomColorIndex] = useState<number | null>(null);
  const [editingCustomColor, setEditingCustomColor] = useState<string>('#FFB6C1');
  const [editingCustomName, setEditingCustomName] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<number | null>(null);

  // 로컬 스토리지에서 색상 이름 불러오기
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomNames(parsed);
      } catch (error) {
        console.error('Failed to load mood color names:', error);
      }
    }
  }, []);

  // 커스텀 색상 저장
  useEffect(() => {
    localStorage.setItem(CUSTOM_COLORS_STORAGE_KEY, JSON.stringify(customColors));
  }, [customColors]);

  const getColorName = useMemo(() => {
    return (color: string, defaultName: string): string => {
      return customNames[color] || defaultName;
    };
  }, [customNames]);

  const handleEditStart = (color: string, currentName: string) => {
    setEditingColor(color);
    // 현재 커스텀 이름이 있으면 그것을, 없으면 기본 이름을 사용
    setEditingName(customNames[color] || currentName);
  };

  const handleEditSave = (color: string) => {
    // 빈 값이어도 저장하여 사용자가 명시적으로 이름을 제거할 수 있게 함
    // 하지만 실제 저장 시에는 trim된 값을 저장
    const trimmedName = editingName.trim();
    
    // 상태 업데이트와 동시에 로컬 스토리지에 직접 저장
    setCustomNames(prev => {
      const updated = { ...prev };
      if (trimmedName) {
        updated[color] = trimmedName;
      } else {
        // 빈 값이면 기본값으로 되돌리기 위해 해당 색상 이름 제거
        delete updated[color];
      }
      // 로컬 스토리지에 즉시 동기적으로 저장 (상태 업데이트 전에 저장)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save mood color names:', error);
      }
      return updated;
    });
    
    // 편집 모드 종료
    setEditingColor(null);
    setEditingName('');
  };

  const handleEditCancel = () => {
    setEditingColor(null);
    setEditingName('');
  };

  const handleRemoveName = (color: string) => {
    setCustomNames(prev => {
      const updated = { ...prev };
      delete updated[color];
      return updated;
    });
  };

  const getCurrentColors = (): MoodColor[] => {
    switch (activeTab) {
      case 'vibrant':
        return vibrantColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'accessible':
        return accessibleColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'gray':
        return grayColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'custom':
        return customColors;
      default:
        return [];
    }
  };

  // customNames가 변경될 때마다 재계산
  const currentColors = useMemo(() => {
    switch (activeTab) {
      case 'vibrant':
        return vibrantColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'accessible':
        return accessibleColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'gray':
        return grayColors.map(c => ({
          ...c,
          name: getColorName(c.color, c.name)
        }));
      case 'custom':
        return customColors;
      default:
        return [];
    }
  }, [activeTab, getColorName, customColors]);

  return (
    <div className="mood-color-picker">
      {/* 날짜 선택 및 취소 버튼 */}
      {(selectedDate !== undefined || onCancel) && (
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          {selectedDate !== undefined && onDateChange && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                날짜 선택
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  width: '100%',
                }}
              />
            </div>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: 'var(--border-color)',
                color: 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                alignSelf: selectedDate !== undefined ? 'flex-end' : 'auto',
                marginTop: selectedDate !== undefined ? '24px' : '0',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--border-color)';
              }}
            >
              취소
            </button>
          )}
        </div>
      )}
      <div className="mood-color-picker-tabs">
        <button
          className={`mood-tab ${activeTab === 'vibrant' ? 'active' : ''}`}
          onClick={() => setActiveTab('vibrant')}
        >
          파스텔
        </button>
        <button
          className={`mood-tab ${activeTab === 'accessible' ? 'active' : ''}`}
          onClick={() => setActiveTab('accessible')}
        >
          접근성 높은
        </button>
        <button
          className={`mood-tab ${activeTab === 'gray' ? 'active' : ''}`}
          onClick={() => setActiveTab('gray')}
        >
          회색
        </button>
        <button
          className={`mood-tab ${activeTab === 'custom' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          커스텀
        </button>
      </div>
      <div className="mood-color-grid">
        {currentColors.map((moodColor, index) => {
          const isEditing = editingColor === moodColor.color;
          const hasCustomName = !!customNames[moodColor.color];
          const isEditingCustom = activeTab === 'custom' && editingCustomColorIndex === index;
          const showPicker = activeTab === 'custom' && showColorPicker === index;
          
          return (
            <div key={activeTab === 'custom' ? `${moodColor.color}-${index}` : moodColor.color} className="mood-color-item">
              {activeTab === 'custom' ? (
                <>
                  <div style={{ position: 'relative' }}>
                    <button
                      className="mood-color-button"
                      onClick={() => {
                        setShowColorPicker(showPicker ? null : index);
                      }}
                      style={{ 
                        backgroundColor: moodColor.color,
                        border: currentSelectedColor === moodColor.color ? '3px solid var(--accent-color)' : '2px solid transparent',
                        boxShadow: currentSelectedColor === moodColor.color ? '0 0 8px rgba(0, 0, 0, 0.3)' : 'none',
                        cursor: 'pointer',
                      }}
                      title={moodColor.name}
                    />
                    {showPicker && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '8px',
                        zIndex: 1000,
                        background: 'var(--bg-primary)',
                        padding: '12px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        <HexColorPicker
                          color={moodColor.color}
                          onChange={(color) => {
                            const updated = [...customColors];
                            updated[index] = { ...updated[index], color };
                            setCustomColors(updated);
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setShowColorPicker(null);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: moodColor.color,
                              color: isLight(moodColor.color) ? '#000000' : '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>적용</span>
                          </button>
                          <button
                            onClick={() => {
                              setCurrentSelectedColor(moodColor.color);
                              setShowColorPicker(null);
                              if (onSave) {
                                onSave(moodColor.color);
                              } else {
                                onColorSelect(moodColor.color);
                              }
                            }}
                            style={{
                              padding: '8px 16px',
                              background: 'var(--accent-color)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>저장</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mood-color-name-container">
                    {isEditingCustom ? (
                      <div className="mood-color-name-edit">
                        <input
                          type="text"
                          value={editingCustomName}
                          onChange={(e) => setEditingCustomName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const updated = [...customColors];
                              updated[index] = { ...updated[index], name: editingCustomName.trim() || `커스텀 색상 ${index + 1}` };
                              setCustomColors(updated);
                              setEditingCustomColorIndex(null);
                              setEditingCustomName('');
                            } else if (e.key === 'Escape') {
                              setEditingCustomColorIndex(null);
                              setEditingCustomName('');
                            }
                          }}
                          autoFocus
                          className="mood-color-name-input"
                          placeholder={`커스텀 색상 ${index + 1}`}
                        />
                        <div className="mood-color-edit-actions">
                          <button
                            onClick={() => {
                              const updated = [...customColors];
                              updated[index] = { ...updated[index], name: editingCustomName.trim() || `커스텀 색상 ${index + 1}` };
                              setCustomColors(updated);
                              setEditingCustomColorIndex(null);
                              setEditingCustomName('');
                            }}
                            className="mood-color-save-btn"
                            title="저장"
                          >
                            <MdCheck size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomColorIndex(null);
                              setEditingCustomName('');
                            }}
                            className="mood-color-cancel-btn"
                            title="취소"
                          >
                            <MdCancel size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mood-color-name-display">
                        <span className="mood-color-name" title={moodColor.name}>
                          {moodColor.name}
                        </span>
                        <div className="mood-color-name-actions">
                          <button
                            className="mood-color-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCustomColorIndex(index);
                              setEditingCustomName(moodColor.name);
                            }}
                            title="이름 수정"
                          >
                            <MdEdit size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    className="mood-color-button"
                    onClick={() => {
                      setCurrentSelectedColor(moodColor.color);
                      onColorSelect(moodColor.color);
                    }}
                    style={{ 
                      backgroundColor: moodColor.color,
                      border: currentSelectedColor === moodColor.color ? '3px solid var(--accent-color)' : '2px solid transparent',
                      boxShadow: currentSelectedColor === moodColor.color ? '0 0 8px rgba(0, 0, 0, 0.3)' : 'none',
                    }}
                    title={moodColor.name}
                  />
                  <div className="mood-color-name-container">
                    {isEditing ? (
                      <div className="mood-color-name-edit">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleEditSave(moodColor.color);
                            } else if (e.key === 'Escape') {
                              handleEditCancel();
                            }
                          }}
                          autoFocus
                          className="mood-color-name-input"
                        />
                        <div className="mood-color-edit-actions">
                          <button
                            onClick={() => handleEditSave(moodColor.color)}
                            className="mood-color-save-btn"
                            title="저장"
                          >
                            <MdCheck size={16} />
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="mood-color-cancel-btn"
                            title="취소"
                          >
                            <MdCancel size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mood-color-name-display">
                        <span className="mood-color-name" title={moodColor.name}>
                          {moodColor.name}
                        </span>
                        <div className="mood-color-name-actions">
                          <button
                            className="mood-color-edit-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditStart(moodColor.color, moodColor.name);
                            }}
                            title="이름 수정"
                          >
                            <MdEdit size={12} />
                          </button>
                          {hasCustomName && (
                            <button
                              className="mood-color-remove-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveName(moodColor.color);
                              }}
                              title="이름 제거"
                            >
                              <MdClose size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {onSave && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => {
              if (currentSelectedColor) {
                onSave(currentSelectedColor);
              }
            }}
            disabled={!currentSelectedColor}
            style={{
              padding: '10px 20px',
              background: currentSelectedColor ? 'var(--accent-color)' : 'var(--border-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: currentSelectedColor ? 'pointer' : 'not-allowed',
              opacity: currentSelectedColor ? 1 : 0.5,
            }}
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}

