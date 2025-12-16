import { useState } from 'react';
import { Quadrant, Category } from '../types';
import './BottomSheet.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTodo: (text: string, quadrant?: Quadrant, categoryId?: string) => void;
  categories: Category[];
}

export default function BottomSheet({
  isOpen,
  onClose,
  onCreateTodo,
  categories,
}: BottomSheetProps) {
  const [todoText, setTodoText] = useState('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | ''>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const quadrantOptions: { value: Quadrant; label: string }[] = [
    { value: 'urgent-important', label: 'Do' },
    { value: 'not-urgent-important', label: 'Plan' },
    { value: 'urgent-not-important', label: 'Delegate' },
    { value: 'not-urgent-not-important', label: 'Delete' },
  ];

  const handleSubmit = () => {
    if (todoText.trim()) {
      onCreateTodo(
        todoText.trim(),
        selectedQuadrant || undefined,
        selectedCategoryId || undefined
      );
      setTodoText('');
      setSelectedQuadrant('');
      setSelectedCategoryId('');
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={handleOverlayClick}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h3>새 할 일 추가</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bottom-sheet-content">
          <div className="form-group">
            <label>일정 이름</label>
            <input
              type="text"
              value={todoText}
              onChange={(e) => setTodoText(e.target.value)}
              placeholder="할 일을 입력하세요"
              className="form-input"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>대분류 (사분면)</label>
            <select
              value={selectedQuadrant}
              onChange={(e) => {
                setSelectedQuadrant(e.target.value as Quadrant);
              }}
              className="form-select"
            >
              <option value="">선택 안 함</option>
              {quadrantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>소분류 (카테고리)</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
              }}
              className="form-select"
            >
              <option value="">선택 안 함</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bottom-sheet-footer">
          <button className="cancel-btn" onClick={onClose}>취소</button>
          <button className="submit-btn" onClick={handleSubmit}>생성</button>
        </div>
      </div>
    </div>
  );
}

