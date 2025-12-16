import React, { useState, useEffect, useRef } from 'react';
import { useTheme, PRESET_THEME_IDS } from '../contexts/ThemeContext';
import { Theme, ThemeColors } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { HexColorPicker } from 'react-colorful';
import { MdEdit, MdDelete } from 'react-icons/md';
import { PawPrint } from 'lucide-react';
import styles from './ThemeSelector.module.css';

const ThemeSelector: React.FC = () => {
  const {
    currentTheme,
    allThemes,
    selectTheme,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    previewTheme,
    resetPreview,
  } = useTheme();

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [customThemeName, setCustomThemeName] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState({ top: 0, left: 0 });
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [deleteThemeConfirm, setDeleteThemeConfirm] = useState<{ id: string; name: string } | null>(null);
  const [customColors, setCustomColors] = useState<ThemeColors>({
    primary: '#f8f9fa',
    secondary: '#333333',
    accent: '#666666',
    background: '#f8f9fa',
    surface: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    border: '#e9ecef',
    danger: '#e68d95f6',
    dangerLight: '#f8d7da',
  });

  // 모든 색상 키 목록 (danger, dangerLight 포함)
  const colorKeys = Object.keys(customColors);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // 컴포넌트가 언마운트되거나 폼이 닫힐 때 미리보기 리셋
  useEffect(() => {
    if (!showCustomForm && isPreviewing) {
      resetPreview();
      setIsPreviewing(false);
    }
  }, [showCustomForm, isPreviewing, resetPreview]);

  // 색상이 변경될 때마다 실시간 미리보기
  useEffect(() => {
    if (showCustomForm && isPreviewing) {
      previewTheme(customColors);
    }
  }, [customColors, showCustomForm, isPreviewing, previewTheme]);

  const handleSaveTheme = () => {
    if (!customThemeName.trim()) return;

    if (editingTheme) {
      // Update existing theme
      updateCustomTheme(editingTheme.id, {
        name: customThemeName,
        colors: customColors,
      });
    } else {
      // Create new theme
      const newTheme: Theme = {
        id: uuidv4(),
        name: customThemeName,
        colors: customColors,
      };
      createCustomTheme(newTheme);
      selectTheme(newTheme.id);
    }

    setShowCustomForm(false);
    setEditingTheme(null);
    setCustomThemeName('');
    setIsPreviewing(false);
    setActiveColorPicker(null);
  };

  const handleCancelCustomForm = () => {
    setShowCustomForm(false);
    setEditingTheme(null);
    setCustomThemeName('');
    setIsPreviewing(false);
    setActiveColorPicker(null);
    resetPreview();
  };

  const handleEditTheme = (theme: Theme) => {
    setEditingTheme(theme);
    setCustomThemeName(theme.name);
    setCustomColors(theme.colors);
    setShowCustomForm(true);
  };

  const togglePreview = () => {
    if (isPreviewing) {
      resetPreview();
      setIsPreviewing(false);
    } else {
      previewTheme(customColors);
      setIsPreviewing(true);
    }
  };

  // 테마의 모든 색상 키
  const getAllColorKeys = (theme: Theme): (keyof ThemeColors)[] => {
    return Object.keys(theme.colors) as (keyof ThemeColors)[];
  };

  const renderThemePreview = (theme: Theme) => {
    const colorKeys = getAllColorKeys(theme);
    const isSelected = currentTheme.id === theme.id;
    
    // 6개씩 두 줄로 나누기
    const firstRow = colorKeys.slice(0, 6);
    const secondRow = colorKeys.slice(6, 12);
    
    return (
      <div
        className={`${styles.themeCardGrid} ${
          isSelected ? styles.selected : ''
        }`}
        onClick={() => selectTheme(theme.id)}
      >
        <div className={styles.colorPreviewGrid}>
          <div className={styles.pawPrintRow}>
            {firstRow.map((colorKey) => (
              <PawPrint
                key={colorKey}
                size={16}
                fill={theme.colors[colorKey]}
                color={theme.colors[colorKey]}
                className={styles.pawPrint}
                title={colorKey}
              />
            ))}
          </div>
          <div className={styles.pawPrintRow}>
            {secondRow.map((colorKey) => (
              <PawPrint
                key={colorKey}
                size={16}
                fill={theme.colors[colorKey]}
                color={theme.colors[colorKey]}
                className={styles.pawPrint}
                title={colorKey}
              />
            ))}
          </div>
        </div>
        <div className={styles.themeName}>{theme.name}</div>
        {!PRESET_THEME_IDS.includes(theme.id) && (
          <div className={styles.themeActions}>
            <button
              className={styles.editTheme}
              onClick={(e) => {
                e.stopPropagation();
                handleEditTheme(theme);
              }}
              title="테마 수정"
            >
              <MdEdit />
            </button>
            <button
              className={styles.deleteTheme}
              onClick={(e) => {
                e.stopPropagation();
                setDeleteThemeConfirm(theme);
              }}
              title="테마 삭제"
            >
              <MdDelete />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.themeSelector}>
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>테마 프리셋</h4>
        <div className={styles.themeGridTwoColumns}>
          {allThemes
            .filter((t) => PRESET_THEME_IDS.includes(t.id))
            .map((theme) => renderThemePreview(theme))}
        </div>
      </div>

      {allThemes.filter((t) => !PRESET_THEME_IDS.includes(t.id)).length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>커스텀 테마</h4>
          <div className={styles.themeGridTwoColumns}>
            {allThemes
              .filter((t) => !PRESET_THEME_IDS.includes(t.id))
              .map((theme) => renderThemePreview(theme))}
          </div>
        </div>
      )}

      {!showCustomForm ? (
        <button
          className={styles.createButton}
          onClick={() => {
            // 현재 선택된 테마의 색상을 기본값으로 설정
            setCustomColors({ ...currentTheme.colors });
            setShowCustomForm(true);
          }}
        >
          + 커스텀 테마 만들기
        </button>
      ) : (
        <div className={styles.customForm} ref={formRef}>
          <h4 className={styles.formTitle}>
            {editingTheme ? '테마 수정' : '커스텀 테마 만들기'}
          </h4>

          <div className={styles.formGroup}>
            <label>테마 이름</label>
            <input
              type="text"
              value={customThemeName}
              onChange={(e) => setCustomThemeName(e.target.value)}
              placeholder="테마 이름을 입력하세요"
            />
          </div>

          <div className={styles.previewToggle}>
            <label className={styles.previewLabel}>
              <input
                type="checkbox"
                checked={isPreviewing}
                onChange={togglePreview}
              />
              실시간 미리보기
            </label>
            <span className={styles.previewHint}>
              {isPreviewing
                ? '변경사항이 실시간으로 적용됩니다'
                : '체크하면 색상 변경을 미리 볼 수 있습니다'}
            </span>
          </div>

          <div className={styles.colorInputs}>
            {colorKeys.map((key) => {
              const value = customColors[key as keyof ThemeColors];
              return (
                <div key={key} className={styles.colorInput}>
                  <label>
                    {key === 'primary' && '주 색상'}
                    {key === 'secondary' && '보조 색상'}
                    {key === 'accent' && '강조 색상'}
                    {key === 'background' && '배경색'}
                    {key === 'surface' && '표면색'}
                    {key === 'text' && '텍스트'}
                    {key === 'textSecondary' && '보조 텍스트'}
                    {key === 'border' && '테두리'}
                    {key === 'danger' && '경고 색상'}
                    {key === 'dangerLight' && '주의 색상'}
                  </label>
                <div className={styles.colorControl}>
                  <button
                    className={styles.colorButton}
                    style={{ backgroundColor: value }}
                    onClick={(e) => {
                      if (activeColorPicker === key) {
                        setActiveColorPicker(null);
                      } else {
                        const button = e.currentTarget;
                        const rect = button.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const viewportWidth = window.innerWidth;
                        const pickerHeight = 220;
                        const pickerWidth = 200;

                        let top = rect.bottom + 10;
                        let left = rect.left;

                        // 화면 아래쪽 공간 체크
                        if (top + pickerHeight > viewportHeight - 20) {
                          // 위쪽으로 표시
                          top = rect.top - pickerHeight - 10;
                        }

                        // 화면 오른쪽 공간 체크
                        if (left + pickerWidth > viewportWidth - 20) {
                          left = viewportWidth - pickerWidth - 20;
                        }

                        // 화면 왼쪽 공간 체크
                        if (left < 20) {
                          left = 20;
                        }

                        setColorPickerPosition({ top, left });
                        setActiveColorPicker(key);
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) =>
                      setCustomColors((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    className={styles.colorText}
                  />
                  {activeColorPicker === key && (
                    <div
                      className={styles.colorPickerPopover}
                      style={{
                        top: `${colorPickerPosition.top}px`,
                        left: `${colorPickerPosition.left}px`,
                      }}
                    >
                      <div
                        className={styles.colorPickerCover}
                        onClick={() => setActiveColorPicker(null)}
                      />
                      <HexColorPicker
                        color={value}
                        onChange={(color) =>
                          setCustomColors((prev) => ({
                            ...prev,
                            [key]: color,
                          }))
                        }
                      />
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={handleCancelCustomForm}
            >
              취소
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSaveTheme}
              disabled={!customThemeName.trim()}
            >
              {editingTheme ? '테마 수정' : '테마 생성'}
            </button>
          </div>
        </div>
      )}

      {/* 테마 삭제 확인 모달 */}
      {deleteThemeConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteThemeConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>테마 삭제</h3>
            <p>"{deleteThemeConfirm.name}" 테마를 삭제하시겠습니까?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteThemeConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={() => {
                deleteCustomTheme(deleteThemeConfirm.id);
                setDeleteThemeConfirm(null);
              }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSelector;

