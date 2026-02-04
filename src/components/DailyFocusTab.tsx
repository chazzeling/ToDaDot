import type React from 'react';
import { useState, useRef, useCallback } from 'react';
import { TodoItem, Category, Quadrant, DateString } from '../types';
import { Bone, Dog, RotateCcw, Bookmark, BookmarkCheck, ArrowDownUp } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { colorToRgba } from '../utils/colorUtils';
import './DailyFocusTab.css';

interface DailyFocusTabProps {
  todos: TodoItem[];
  categories: Category[];
  selectedDate: DateString;
  onToggleTodo: (id: string) => void;
  onReorderFocusTodos: (draggedId: string, targetId: string) => void;
  onResetTodayFocus: () => void;
  onOrganizeFocusTodos: () => void;
  onToggleTodayFocus: (id: string) => void;
}

const quadrantLabels: Record<Quadrant, { title: string; shortTitle: string }> = {
  'urgent-important': { title: 'Do', shortTitle: 'Do' },
  'not-urgent-important': { title: 'Plan', shortTitle: 'Plan' },
  'urgent-not-important': { title: 'Delegate', shortTitle: 'Delegate' },
  'not-urgent-not-important': { title: 'Delete', shortTitle: 'Delete' },
  'uncategorized': { title: '미분류', shortTitle: '미분류' },
};

export default function DailyFocusTab({
  todos,
  categories,
  selectedDate,
  onToggleTodo,
  onReorderFocusTodos,
  onResetTodayFocus,
  onOrganizeFocusTodos,
  onToggleTodayFocus,
}: DailyFocusTabProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const timePlannerResetRef = useRef<() => void>(() => {});

  // Daily Focus 투두 목록 가져오기
  const focusTodos = todos
    .filter(todo => todo.isTodayFocus === true)
    .map((todo, index) => ({
      ...todo,
      focusOrder: todo.focusOrder ?? index,
    }))
    .sort((a, b) => (a.focusOrder ?? 0) - (b.focusOrder ?? 0));

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `focus-todo:${id}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
  };

  const handleReset = () => {
    // 타임 플래너 데이터 초기화
    const saved = localStorage.getItem('time-planner-data');
    if (saved) {
      try {
        const allData: Record<DateString, any> = JSON.parse(saved);
        allData[selectedDate] = {
          date: selectedDate,
          blocks: [],
          categories: allData[selectedDate]?.categories || [],
        };
        localStorage.setItem('time-planner-data', JSON.stringify(allData));
      } catch (e) {
        console.error('Failed to reset time planner data:', e);
      }
    }
    // Daily Focus 할 일 목록 초기화
    onResetTodayFocus();
    setShowResetConfirm(false);
  };

  return (
    <div id="daily-focus-view" className="daily-focus-tab">
      <div className="tab-header">
        <div className="tab-title-container">
          <h2>Daily Focus</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', transform: 'translateY(2px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bookmark size={18} color="var(--text-primary)" />
              <span>{focusTodos.filter(t => !t.completed).length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookmarkCheck size={18} color="var(--text-primary)" />
              <span>{focusTodos.filter(t => t.completed).length}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0' }}>
          <button 
            className="reset-focus-btn" 
            onClick={onOrganizeFocusTodos}
            disabled={focusTodos.filter(t => t.completed).length === 0}
            title="완료된 할 일을 맨 아래로 정렬"
          >
            <ArrowDownUp size={16} />
            정렬
          </button>
          <button 
            className="reset-focus-btn" 
            onClick={() => setShowResetConfirm(true)}
            disabled={focusTodos.length === 0}
          >
            <RotateCcw size={16} />
            리셋
          </button>
        </div>
      </div>

      {showResetConfirm && (
        <ConfirmDialog
          message="오늘의 집중 목록을 정말 리셋할까요?"
          confirmText="리셋"
          cancelText="취소"
          onConfirm={handleReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      <div className="daily-focus-content">
        <div className="focus-list-main">
          {focusTodos.length === 0 ? (
            <div className="empty-focus-message">
              <Bone size={48} color="var(--text-secondary)" />
              <p>오늘 집중할 할 일을 추가해보세요!</p>
              <p className="hint">매트릭스 또는 카테고리 탭에서 할 일 옆의 뼈 아이콘을 클릭하세요.</p>
            </div>
          ) : (
            <div
              className="focus-todos-list"
              onDragOver={handleDragOver}
            >
              {focusTodos.map((todo) => {
                const isDropTarget = dropTargetId === todo.id;
                const isDragged = draggedItem === todo.id;
                
                // 카테고리 정보 가져오기
                const category = todo.categoryId 
                  ? categories.find(c => c.id === todo.categoryId)
                  : null;
                
                // 매트릭스 정보 가져오기
                const quadrantInfo = todo.quadrant 
                  ? quadrantLabels[todo.quadrant]
                  : null;

                return (
                  <div
                    key={todo.id}
                    className={`focus-todo-item ${isDragged ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (draggedItem && draggedItem !== todo.id) {
                        setDropTargetId(todo.id);
                      }
                    }}
                    onDragLeave={() => {
                      setDropTargetId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDropTargetId(null);
                      if (draggedItem && draggedItem !== todo.id) {
                        onReorderFocusTodos(draggedItem, todo.id);
                      }
                      setDraggedItem(null);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggleTodo(todo.id)}
                      className="todo-checkbox acorn-checkbox"
                      style={{ '--acorn-color': 'var(--accent-color)' } as React.CSSProperties}
                    />
                    <div className="focus-todo-content">
                      <span
                        className={`focus-todo-text ${todo.completed ? 'completed' : ''}`}
                        onClick={() => onToggleTodo(todo.id)}
                      >
                        {todo.text}
                      </span>
                      {(todo.memo || todo.time) && (
                        <div className="focus-todo-meta">
                          {todo.time && (
                            <span className="focus-todo-time-inline">{todo.time}</span>
                          )}
                          {todo.memo && (
                            <span className="focus-todo-memo-inline">{todo.memo}</span>
                          )}
                        </div>
                      )}
                      {(category || quadrantInfo) && (
                        <div className="focus-todo-tags">
                          {category && (
                            <span 
                              className="focus-tag focus-tag-category" 
                              title={`카테고리: ${category.name}`}
                              style={{ 
                                backgroundColor: colorToRgba(category.color, 0.2), 
                                color: category.color, 
                                borderColor: colorToRgba(category.color, 0.4) 
                              }}
                            >
                              {category.name}
                            </span>
                          )}
                          {quadrantInfo && (
                            <span className="focus-tag focus-tag-quadrant" title={`매트릭스: ${quadrantInfo.title}`}>
                              {quadrantInfo.shortTitle}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="focus-remove-btn"
                      onClick={() => onToggleTodayFocus(todo.id)}
                      title="집중 목록에서 제거"
                    >
                      <Dog size={18} className="focus-icon-active" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
