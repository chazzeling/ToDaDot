import type React from 'react';
import { useState } from 'react';
import { Routine } from '../hooks/useRoutines';
import { DateString, TodoItem } from '../types';
import { ListRestart, Plus, X, Bookmark, BookmarkCheck } from 'lucide-react';
import './RoutineTab.css';

interface RoutineTabProps {
  routines: Routine[];
  selectedDate: DateString;
  onAddRoutine: (text: string) => void;
  onUpdateRoutine: (id: string, text: string) => void;
  onDeleteRoutine: (id: string) => void;
  onReorderRoutines: (draggedId: string, targetId: string) => void;
  onConvertRoutineToTodo: (routineId: string, date: DateString) => void;
  activeRoutineIds: string[]; // 당일 활성화된 루틴 ID 목록
  todos: TodoItem[]; // 할 일 목록 (활성화된 루틴에서 생성된 것들)
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function RoutineTab({
  routines,
  selectedDate,
  onAddRoutine,
  onUpdateRoutine,
  onDeleteRoutine,
  onReorderRoutines,
  onConvertRoutineToTodo,
  activeRoutineIds,
  todos,
  onToggleTodo,
  onDeleteTodo,
}: RoutineTabProps) {
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newRoutineText, setNewRoutineText] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 루틴을 날짜순으로 정렬 (order 기준)
  const sortedRoutines = [...routines].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // 활성화된 루틴 (선택된 날짜 기준)
  const activeRoutines = sortedRoutines.filter(r => activeRoutineIds.includes(r.id));

  // 비활성화된 루틴 (회색 표시)
  const inactiveRoutines = sortedRoutines.filter(r => !activeRoutineIds.includes(r.id));

  const handleRoutineClick = (routineId: string) => {
    if (activeRoutineIds.includes(routineId)) {
      // 이미 활성화된 경우, 할 일 목록에서 찾아서 토글
      const todo = todos.find(t => t.id === `routine-${routineId}-${selectedDate}`);
      if (todo) {
        onToggleTodo(todo.id);
      }
    } else {
      // 비활성화된 경우, 할 일로 변환
      onConvertRoutineToTodo(routineId, selectedDate);
    }
  };

  const handleEdit = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setEditText(routine.text);
  };

  const handleSaveEdit = (routineId: string) => {
    if (editText.trim()) {
      onUpdateRoutine(routineId, editText.trim());
    }
    setEditingRoutineId(null);
    setEditText('');
  };

  const handleAddNewRoutine = () => {
    if (newRoutineText.trim()) {
      onAddRoutine(newRoutineText.trim());
      setNewRoutineText('');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `routine:${id}`);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      onReorderRoutines(draggedItem, targetId);
    }
    setDraggedItem(null);
    setDropTargetId(null);
  };

  // 선택된 날짜의 활성화된 루틴 할 일만 필터링 (북마크 표시용)
  // 삭제된 루틴의 할 일은 제외 (루틴 목록에 존재하는 루틴만)
  const routineTodos = todos.filter(t => {
    if (!t.id.startsWith('routine-')) return false;
    // routine-{routineId}-{date} 형식에서 날짜 부분 확인
    const parts = t.id.split('-');
    if (parts.length < 3) return false;
    const todoDate = parts.slice(2).join('-'); // 날짜 부분 추출
    if (todoDate !== selectedDate) return false;
    
    // 루틴 ID 추출
    const routineId = parts[1];
    // 루틴 목록에 존재하는 루틴만 포함 (삭제된 루틴 제외)
    return routines.some(r => r.id === routineId);
  });
  const completedCount = routineTodos.filter(t => t.completed).length;
  const incompleteCount = routineTodos.filter(t => !t.completed).length;

  return (
    <div className="routine-tab">
      <div className="tab-header">
        <div className="tab-title-container">
          <h2>Routine</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', transform: 'translateY(2px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bookmark size={18} color="var(--text-primary)" />
              <span>{incompleteCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookmarkCheck size={18} color="var(--text-primary)" />
              <span>{completedCount}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="manage-routine-btn"
            onClick={() => setShowManageModal(true)}
            title="루틴 관리"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px'
            }}
          >
            <ListRestart size={16} />
          </button>
        </div>
      </div>

      <div className="routine-content">
          {/* 활성화된 루틴 (할 일로 변환된 것들) */}
        {activeRoutines.length > 0 && (
          <div className="routine-section">
            <h3>오늘의 루틴</h3>
            <div className="routine-list">
              {activeRoutines.map((routine) => {
                const todo = todos.find(t => t.id === `routine-${routine.id}-${selectedDate}`);
                const isCompleted = todo?.completed || false;
                
                return (
                  <div
                    key={routine.id}
                    className={`routine-item active ${isCompleted ? 'completed' : ''}`}
                    onClick={() => handleRoutineClick(routine.id)}
                    draggable={false}
                  >
                    <input
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => todo && onToggleTodo(todo.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="todo-checkbox acorn-checkbox"
                      style={{ '--acorn-color': 'var(--accent-color)' } as React.CSSProperties}
                    />
                    <span className="routine-text">{routine.text}</span>
                    <button
                      className="routine-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (todo) {
                          onDeleteTodo(todo.id);
                        }
                      }}
                      title="루틴 비활성화"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 비활성화된 루틴 (회색 표시) */}
        <div className="routine-section">
          <h3>루틴 목록</h3>
          <div className="routine-list">
            {inactiveRoutines.map((routine) => (
              <div
                key={routine.id}
                className="routine-item inactive"
                onClick={() => handleRoutineClick(routine.id)}
                draggable={showManageModal}
                onDragStart={(e) => handleDragStart(e, routine.id)}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, routine.id)}
                style={{
                  opacity: draggedItem === routine.id ? 0.5 : 1,
                  backgroundColor: dropTargetId === routine.id ? 'var(--main-color)' : undefined,
                }}
              >
                <span className="routine-text">{routine.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 루틴 관리 모달 */}
      {showManageModal && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-content routine-manage-modal" onClick={(e) => e.stopPropagation()}>
            <h3>루틴 관리</h3>
            
            {/* 새 루틴 추가 */}
            <div className="add-routine-form">
              <input
                type="text"
                value={newRoutineText}
                onChange={(e) => setNewRoutineText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddNewRoutine();
                  }
                }}
                placeholder="새 루틴 추가..."
                className="routine-input"
              />
              <button onClick={handleAddNewRoutine} className="add-routine-btn">
                <Plus size={16} />
              </button>
            </div>

            {/* 루틴 목록 */}
            <div className="routine-manage-list">
              {sortedRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="routine-manage-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, routine.id)}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, routine.id)}
                  style={{
                    opacity: draggedItem === routine.id ? 0.5 : 1,
                    backgroundColor: dropTargetId === routine.id ? 'var(--main-color)' : undefined,
                  }}
                >
                  {editingRoutineId === routine.id ? (
                    <div className="routine-edit-form">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(routine.id);
                          } else if (e.key === 'Escape') {
                            setEditingRoutineId(null);
                            setEditText('');
                          }
                        }}
                        className="routine-input"
                        autoFocus
                      />
                      <button onClick={() => handleSaveEdit(routine.id)}>저장</button>
                      <button onClick={() => {
                        setEditingRoutineId(null);
                        setEditText('');
                      }}>취소</button>
                    </div>
                  ) : (
                    <>
                      <span className="routine-text">{routine.text}</span>
                      <div className="routine-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(routine);
                          }}
                          className="edit-btn"
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(routine.id);
                          }}
                          className="delete-btn"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowManageModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (() => {
        const routineId = showDeleteConfirm;
        
        const handleDelete = () => {
          // 루틴 템플릿 삭제 + 모든 루틴 인스턴스(과거 기록 포함) 삭제
          todos.filter(t => t.id.startsWith(`routine-${routineId}-`)).forEach(todo => {
            onDeleteTodo(todo.id);
          });
          onDeleteRoutine(routineId);
          setShowDeleteConfirm(null);
        };
        
        return (
          <div className="confirm-dialog-overlay" onClick={() => setShowDeleteConfirm(null)}>
            <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-dialog-content">
                <p className="confirm-dialog-message">
                  해당 루틴 삭제 시 과거 기록된 루틴 기록까지 삭제됩니다. 정말 삭제할까요?
                </p>
              </div>
              <div className="confirm-dialog-buttons">
                <button className="confirm-dialog-btn cancel-btn" onClick={() => setShowDeleteConfirm(null)}>
                  취소
                </button>
                <button className="confirm-dialog-btn confirm-btn" onClick={handleDelete}>
                  삭제
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

