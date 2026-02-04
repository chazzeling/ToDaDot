import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { TodoItem, Category } from '../types';
import CategoryColorSettings from './CategoryColorSettings';
import MemoTimeBottomSheet from './MemoTimeBottomSheet';
import { Bookmark, BookmarkCheck, Bone, Dog, FolderPen, ArrowUpDown, ListTodo, BadgePlus } from 'lucide-react';
import './CategoryTab.css';

interface CategoryTabProps {
  todos: TodoItem[];
  allTodos: TodoItem[]; // 모든 날짜의 todos (드롭 로직용)
  categories: Category[];
  selectedDate: string;
  onAddTodo: (categoryId: string, text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onMoveTodo: (id: string, newCategoryId: string) => void;
  onReorderTodo?: (draggedId: string, targetId: string, categoryId: string) => void;
  onOrganizeTodosInCategory: (categoryId: string, date: string) => Promise<void>;
  onCreateCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories?: (draggedId: string, targetId: string) => void;
  onOpenBottomSheet: () => void;
  onEditTodo: (id: string, text: string) => void;
  onChangeDate: (id: string, newDate: string) => void;
  onUpdateMemo: (id: string, memo: string) => void;
  onDeleteMemo: (id: string) => void;
  onSetTime: (id: string, time: string) => void;
  onDeleteTime: (id: string) => void;
  getTodayDateString: () => string;
  moveIncompleteTodosToTomorrow: (date: string) => void;
  moveIncompleteTodosToToday: (date: string) => void;
  moveIncompleteTodosToDate: (date: string, targetDate: string) => void;
  deleteIncompleteTodos: (date: string) => void;
  deleteAllTodos: (date: string) => void;
  onToggleTodayFocus: (id: string) => void;
  duplicateTodoToday: (id: string) => void;
  duplicateTodoToDate: (id: string, targetDate: string) => void;
}

export default function CategoryTab({
  todos,
  allTodos,
  categories,
  selectedDate,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onMoveTodo,
  onReorderTodo,
  onOrganizeTodosInCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onReorderCategories,
  onOpenBottomSheet,
  onEditTodo,
  onChangeDate,
  onUpdateMemo,
  onDeleteMemo,
  onSetTime,
  onDeleteTime,
  getTodayDateString,
  moveIncompleteTodosToTomorrow,
  moveIncompleteTodosToToday,
  moveIncompleteTodosToDate,
  deleteIncompleteTodos,
  deleteAllTodos,
  onToggleTodayFocus,
  duplicateTodoToday,
  duplicateTodoToDate,
}: CategoryTabProps) {
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#333');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#333');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null>(null);
  const [dropTargetPosition, setDropTargetPosition] = useState<'top' | 'bottom' | null>(null);
  const [newTodoTexts, setNewTodoTexts] = useState<Record<string, string>>({});
  const [showInputForCategory, setShowInputForCategory] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ categoryId: string; categoryName: string } | null>(null);
  const [showTodoManageModal, setShowTodoManageModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>('');
  const [deleteIncompleteConfirm, setDeleteIncompleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#333');
      setShowCreateModal(false);
    }
  };

  const handleEditCategory = () => {
    if (showEditModal && editCategoryName.trim()) {
      onUpdateCategory(showEditModal.id, editCategoryName.trim(), editCategoryColor);
      setShowEditModal(null);
      setEditCategoryName('');
      setEditCategoryColor('#333');
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setDeleteConfirm({ categoryId, categoryName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeleteCategory(deleteConfirm.categoryId);
      setDeleteConfirm(null);
    }
  };

  const handleAddTodo = (categoryId: string) => {
    const text = newTodoTexts[categoryId]?.trim();
    if (text) {
      onAddTodo(categoryId, text);
      setNewTodoTexts({ ...newTodoTexts, [categoryId]: '' });
      setShowInputForCategory(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, categoryId: string) => {
    if (e.key === 'Enter') {
      handleAddTodo(categoryId);
    }
  };

  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    setDraggedItem(todoId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `todo:${todoId}`);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetId(null);
    setDropTargetCategoryId(null);
    setDropTargetPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, categoryId: string) => {
    console.log('📦 DROP EVENT FIRED! CategoryTab handleDrop');
    e.preventDefault();
    e.stopPropagation();
    
    // dataTransfer에서도 ID 가져오기 (fallback)
    let todoId = draggedItem;
    if (!todoId) {
      const data = e.dataTransfer.getData('text/plain');
      if (data.startsWith('todo:')) {
        todoId = data.replace('todo:', '');
        console.log(`  - dataTransfer에서 ID 추출: ${todoId}`);
      }
    }
    
    console.log(`  - categoryId=${categoryId || 'null (미분류)'}, draggedItem=${draggedItem}, todoId=${todoId}`);
    setDropTargetCategoryId(null);
    
    if (todoId) {
      // allTodos에서 찾기 (현재 날짜뿐만 아니라 모든 할 일)
      const draggedTodo = allTodos.find(t => t.id === todoId);
      if (draggedTodo) {
        console.log(`  - 드래그된 할 일: ${draggedTodo.text}, 현재 categoryId: ${draggedTodo.categoryId || 'null'}, 목표 categoryId: ${categoryId || 'null (미분류)'}`);
        if (draggedTodo.categoryId === categoryId) {
          // 같은 영역 내 순서 변경은 todo 아이템의 onDrop에서 처리
          console.log(`  ⚠️ 같은 영역이므로 순서 변경은 todo 아이템에서 처리`);
          return;
        }
        // 다른 영역으로 이동 (categoryId가 null이면 미분류로 이동)
        const targetCategoryId = categoryId || null; // 명시적으로 null로 설정
        console.log(`  ✅ 다른 영역으로 이동 실행: onMoveTodo(${todoId}, ${targetCategoryId || 'null (미분류)'})`);
        onMoveTodo(todoId, targetCategoryId);
        setDraggedItem(null);
      } else {
        console.log(`  ❌ 드래그된 할 일을 찾을 수 없음 (allTodos에서 검색, ID: ${todoId})`);
      }
    } else {
      console.log(`  ❌ draggedItem과 dataTransfer 모두에서 ID를 가져올 수 없음`);
    }
  };

  const getTodosByCategory = (categoryId: string) => {
    // null, undefined, 빈 문자열도 처리
    // completed 상태와 관계없이 모든 할 일 포함
    const filtered = todos.filter((todo) => {
      // categoryId가 null이거나 undefined인 경우는 제외 (미분류로 분류됨)
      if (!todo.categoryId) {
        return false;
      }
      return todo.categoryId === categoryId;
    });
    return filtered.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  };

  // 미분류: categoryId가 null, undefined, 'uncategorized'인 모든 투두
  // 또는 유효하지 않은 카테고리 ID를 가진 할 일도 미분류로 처리
  // quadrant가 있어도 categoryId가 없으면 미분류로 표시
  // completed 상태와 관계없이 모든 할 일 포함 (완료된 할 일도 포함)
  const validCategoryIds = new Set(categories.map(cat => cat.id));
  const uncategorizedTodos = todos.filter((todo) => {
    // categoryId가 없거나 null이거나 undefined이거나 'uncategorized' 문자열인 경우
    if (!todo.categoryId || todo.categoryId === 'uncategorized') {
      return true;
    }
    // 유효하지 않은 카테고리 ID를 가진 할 일도 미분류로 처리
    if (!validCategoryIds.has(todo.categoryId)) {
      return true;
    }
    return false;
  }).sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));

  // 오늘 날짜 확인 (한국 시간 기준)
  const todayDateString = getTodayDateString();
  const isTodaySelected = selectedDate === todayDateString;

  // 투두 관리 핸들러
  const handleMoveIncompleteToTomorrow = () => {
    moveIncompleteTodosToTomorrow(selectedDate);
    setShowTodoManageModal(false);
  };

  const handleMoveIncompleteToToday = () => {
    moveIncompleteTodosToToday(selectedDate);
    setShowTodoManageModal(false);
  };

  const handleMoveIncompleteToAnotherDay = () => {
    setShowDatePicker(true);
  };

  const handleConfirmMoveToDate = () => {
    if (selectedTargetDate) {
      moveIncompleteTodosToDate(selectedDate, selectedTargetDate);
      setShowDatePicker(false);
      setShowTodoManageModal(false);
      setSelectedTargetDate('');
    } else {
      alert('날짜를 선택해주세요.');
    }
  };

  const handleDeleteIncomplete = () => {
    setDeleteIncompleteConfirm(true);
  };

  const confirmDeleteIncomplete = () => {
    deleteIncompleteTodos(selectedDate);
    setShowTodoManageModal(false);
    setDeleteIncompleteConfirm(false);
  };

  const handleClearAllTodos = () => {
    setDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    deleteAllTodos(selectedDate);
    setShowTodoManageModal(false);
    setDeleteAllConfirm(false);
  };

  return (
    <div className="category-tab">
      <div className="tab-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2>Category</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', transform: 'translateY(2px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Bookmark size={18} color="var(--text-primary)" />
              <span>{todos.filter(t => !t.completed).length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <BookmarkCheck size={18} color="var(--text-primary)" />
              <span>{todos.filter(t => t.completed).length}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="manage-category-btn" 
            onClick={() => setShowManageModal(true)}
            title="카테고리 관리"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px'
            }}
          >
            <FolderPen size={16} />
          </button>
          <button 
            className="manage-todo-btn" 
            onClick={() => setShowTodoManageModal(true)}
            title="투두 관리"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px'
            }}
          >
            <ListTodo size={16} />
          </button>
          <button 
            className="create-category-btn" 
            onClick={onOpenBottomSheet}
            title="새 할 일 추가"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '10px'
            }}
          >
            <BadgePlus size={16} />
          </button>
        </div>
      </div>

      <div className="categories-grid">
        {categories
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((category) => (
          <CategoryBox
            key={category.id}
            category={category}
            todos={getTodosByCategory(category.id)}
            newTodoText={newTodoTexts[category.id] || ''}
            showInput={showInputForCategory === category.id}
            onTextChange={(text) =>
              setNewTodoTexts({ ...newTodoTexts, [category.id]: text })
            }
            onAdd={() => handleAddTodo(category.id)}
            onKeyPress={(e) => handleKeyPress(e, category.id)}
            onToggle={onToggleTodo}
            onDelete={onDeleteTodo}
            onShowInput={() => setShowInputForCategory(category.id)}
            onHideInput={() => setShowInputForCategory(null)}
            onEdit={() => {
              setEditCategoryName(category.name);
              setEditCategoryColor(category.color);
              setShowEditModal(category);
            }}
            onDeleteCategory={() => handleDeleteCategory(category.id, category.name)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInCategory={onOrganizeTodosInCategory}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
            setDropTargetId={setDropTargetId}
            dropTargetCategoryId={dropTargetCategoryId}
            setDropTargetCategoryId={setDropTargetCategoryId}
            dropTargetPosition={dropTargetPosition}
            setDropTargetPosition={setDropTargetPosition}
            allTodos={allTodos}
            onEditTodo={onEditTodo}
            onChangeDate={onChangeDate}
            onUpdateMemo={onUpdateMemo}
            onDeleteMemo={onDeleteMemo}
            onSetTime={onSetTime}
            onDeleteTime={onDeleteTime}
            selectedDate={selectedDate}
            onToggleTodayFocus={onToggleTodayFocus}
            duplicateTodoToday={duplicateTodoToday}
            duplicateTodoToDate={duplicateTodoToDate}
          />
        ))}
      </div>

      {/* 미분류 */}
      <div className="uncategorized-section">
        <CategoryBox
          category={{ id: 'uncategorized', name: '미분류', color: '#999', createdAt: 0 }}
          todos={uncategorizedTodos}
          newTodoText={newTodoTexts['uncategorized'] || ''}
          showInput={showInputForCategory === 'uncategorized'}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, uncategorized: text })
          }
          onAdd={() => handleAddTodo('uncategorized')}
          onKeyPress={(e) => handleKeyPress(e, 'uncategorized')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForCategory('uncategorized')}
          onHideInput={() => setShowInputForCategory(null)}
          onEdit={() => {}}
          onDeleteCategory={() => {}}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInCategory={onOrganizeTodosInCategory}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetCategoryId={dropTargetCategoryId}
          setDropTargetCategoryId={setDropTargetCategoryId}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          selectedDate={selectedDate}
          onToggleTodayFocus={onToggleTodayFocus}
        />
      </div>

      {/* 카테고리 관리 모달 */}
      {showManageModal && (
        <div className="modal-overlay" onClick={() => setShowManageModal(false)}>
          <div className="modal-content manage-modal" onClick={(e) => e.stopPropagation()}>
            <h3>카테고리 관리</h3>
            <div className="manage-actions">
              <button className="manage-action-btn" onClick={() => {
                setShowManageModal(false);
                setShowCreateModal(true);
              }}>
                새 카테고리 생성
              </button>
            </div>
            <div className="categories-list">
              {categories
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((category) => (
                <div 
                  key={category.id} 
                  className={`manage-category-item ${draggedCategoryId === category.id ? 'dragging' : ''} ${dropTargetCategoryId === category.id ? 'drop-target' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setDraggedCategoryId(category.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCategoryId && draggedCategoryId !== category.id) {
                      setDropTargetCategoryId(category.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDropTargetCategoryId(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedCategoryId && draggedCategoryId !== category.id && onReorderCategories) {
                      onReorderCategories(draggedCategoryId, category.id);
                    }
                    setDraggedCategoryId(null);
                    setDropTargetCategoryId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedCategoryId(null);
                    setDropTargetCategoryId(null);
                  }}
                >
                  <div className="category-info">
                    <span className="category-color-indicator" style={{ backgroundColor: category.color }}></span>
                    <span>{category.name}</span>
                  </div>
                  <div className="category-actions">
                    <button className="edit-btn" onClick={() => {
                      setShowManageModal(false);
                      setEditCategoryName(category.name);
                      setEditCategoryColor(category.color);
                      setShowEditModal(category);
                    }}>수정</button>
                    <button className="delete-btn" onClick={() => {
                      setShowManageModal(false);
                      handleDeleteCategory(category.id, category.name);
                    }}>삭제</button>
                  </div>
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

      {/* 카테고리 생성 모달 */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>새 카테고리 생성</h3>
            <div className="modal-form">
              <label>
                카테고리 이름
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="카테고리 이름 입력"
                  className="modal-input"
                  autoFocus
                />
              </label>
              <CategoryColorSettings
                color={newCategoryColor}
                onChange={setNewCategoryColor}
                label="체크박스 색상"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowCreateModal(false)}>
                취소
              </button>
              <button className="modal-confirm" onClick={handleCreateCategory}>
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 수정 모달 */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>카테고리 수정</h3>
            <div className="modal-form">
              <label>
                카테고리 이름
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  placeholder="카테고리 이름 입력"
                  className="modal-input"
                  autoFocus
                />
              </label>
              <CategoryColorSettings
                color={editCategoryColor}
                onChange={setEditCategoryColor}
                label="체크박스 색상"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowEditModal(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={handleEditCategory}>
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>카테고리 삭제</h3>
            <p>
              이 카테고리를 삭제하면 여기에 할당된 모든 할 일은 '미분류' 카테고리로 자동 이동됩니다.
              <br />
              <br />
              이 카테고리를 정말 삭제할까요?
            </p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteConfirm(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 투두 관리 모달 */}
      {showTodoManageModal && (
        <div className="modal-overlay" onClick={() => setShowTodoManageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>투두 관리 ({selectedDate})</h3>
            <div className="todo-manage-actions">
              {isTodaySelected ? (
                <>
                  <button className="todo-manage-btn" onClick={handleMoveIncompleteToTomorrow}>
                    미완료된 항목을 내일로 보내기
                  </button>
                  <button className="todo-manage-btn" onClick={handleMoveIncompleteToAnotherDay}>
                    미완료된 항목을 다른 날로 보내기
                  </button>
                  <button className="todo-manage-btn" onClick={handleDeleteIncomplete}>
                    미완료 항목을 삭제하기
                  </button>
                  <button className="todo-manage-btn" onClick={handleClearAllTodos}>
                    모든 항목을 삭제하기
                  </button>
                </>
              ) : (
                <>
                  <button className="todo-manage-btn" onClick={handleMoveIncompleteToToday}>
                    미완료된 항목을 오늘로 보내기
                  </button>
                  <button className="todo-manage-btn" onClick={handleMoveIncompleteToAnotherDay}>
                    미완료된 항목을 다른 날로 보내기
                  </button>
                  <button className="todo-manage-btn" onClick={handleDeleteIncomplete}>
                    미완료 항목을 삭제하기
                  </button>
                  <button className="todo-manage-btn" onClick={handleClearAllTodos}>
                    모든 항목을 삭제하기
                  </button>
                </>
              )}
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowTodoManageModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 날짜 선택기 모달 */}
      {showDatePicker && (
        <div className="modal-overlay" onClick={() => setShowDatePicker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>날짜 선택</h3>
            <div className="modal-form">
              <label>
                이동할 날짜 선택
                <input
                  type="date"
                  value={selectedTargetDate}
                  onChange={(e) => setSelectedTargetDate(e.target.value)}
                  className="modal-input"
                  autoFocus
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => {
                setShowDatePicker(false);
                setSelectedTargetDate('');
              }}>
                취소
              </button>
              <button className="modal-confirm" onClick={handleConfirmMoveToDate}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CategoryBoxProps {
  category: Category | { id: string; name: string; color: string; createdAt: number };
  todos: TodoItem[];
  newTodoText: string;
  showInput: boolean;
  onTextChange: (text: string) => void;
  onAdd: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onShowInput: () => void;
  onHideInput: () => void;
  onEdit?: () => void;
  onDeleteCategory?: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, categoryId: string) => void;
  onDragEnd?: () => void;
  onReorderTodo?: (draggedId: string, targetId: string, categoryId: string) => void;
  onOrganizeTodosInCategory?: (categoryId: string, date: string) => Promise<void>;
  draggedItem: string | null;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
  dropTargetCategoryId: string | null;
  setDropTargetCategoryId: (categoryId: string | null) => void;
  dropTargetPosition: 'top' | 'bottom' | null;
  setDropTargetPosition: (position: 'top' | 'bottom' | null) => void;
  allTodos: TodoItem[];
  onEditTodo: (id: string, text: string) => void;
  onChangeDate: (id: string, newDate: string) => void;
  onUpdateMemo: (id: string, memo: string) => void;
  onDeleteMemo: (id: string) => void;
  onSetTime: (id: string, time: string) => void;
  onDeleteTime: (id: string) => void;
  selectedDate: string;
  onToggleTodayFocus: (id: string) => void;
  duplicateTodoToday: (id: string) => void;
  duplicateTodoToDate: (id: string, targetDate: string) => void;
}

function CategoryBox({
  category,
  todos,
  newTodoText,
  showInput,
  onTextChange,
  onAdd,
  onKeyPress,
  onToggle,
  onDelete,
  onShowInput,
  onHideInput,
  onEdit,
  onDeleteCategory,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onReorderTodo,
  onOrganizeTodosInCategory,
  draggedItem,
  dropTargetId,
  setDropTargetId,
  dropTargetCategoryId,
  setDropTargetCategoryId,
  dropTargetPosition,
  setDropTargetPosition,
  allTodos,
  onEditTodo,
  onChangeDate,
  onUpdateMemo,
  onDeleteMemo,
  onSetTime,
  onDeleteTime,
  selectedDate,
  onToggleTodayFocus,
  duplicateTodoToday,
  duplicateTodoToDate,
}: CategoryBoxProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showMemoBottomSheet, setShowMemoBottomSheet] = useState<string | null>(null);
  const [showTimeBottomSheet, setShowTimeBottomSheet] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);
  const [newDate, setNewDate] = useState('');
  const [showDuplicateDatePicker, setShowDuplicateDatePicker] = useState<string | null>(null);
  const [duplicateTargetDate, setDuplicateTargetDate] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };
    // click 이벤트로 변경하여 onClick과의 충돌 방지
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleMenuClick = (todoId: string, e: React.MouseEvent) => {
    // 이벤트 전파 완전 차단
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    
    // 메뉴를 버튼 위쪽에 표시 (화면 밖으로 나가지 않도록 조정)
    if (openMenuId === todoId) {
      // 이미 열려있으면 닫기
      setOpenMenuId(null);
      setMenuPosition(null);
    } else {
      // 새로 열기 - 화면 경계 확인
      const menuWidth = 120;
      const menuHeight = 150;
      let x = rect.right - menuWidth;
      let y = rect.top - menuHeight;
      
      // 화면 왼쪽 경계 확인
      if (x < 0) {
        x = rect.left;
      }
      
      // 화면 위쪽 경계 확인
      if (y < 0) {
        y = rect.bottom + 5;
      }
      
      setMenuPosition({ x, y });
      setOpenMenuId(todoId);
    }
  };

  const handleEdit = (todo: TodoItem) => {
    setEditText(todo.text);
    setEditingTodoId(todo.id);
    setOpenMenuId(null);
  };

  const handleSaveEdit = (todoId: string) => {
    if (editText.trim()) {
      onEditTodo(todoId, editText.trim());
    }
    setEditingTodoId(null);
    setEditText('');
  };

  const handleAddMemo = (todo: TodoItem) => {
    setShowMemoBottomSheet(todo.id);
    setOpenMenuId(null);
  };

  const handleSaveMemo = (todoId: string, value: string) => {
    if (value.trim()) {
      onUpdateMemo(todoId, value.trim());
    } else {
      onDeleteMemo(todoId);
    }
  };

  const handleSetTime = (todo: TodoItem) => {
    setShowTimeBottomSheet(todo.id);
    setOpenMenuId(null);
  };

  const handleSaveTime = (todoId: string, value: string) => {
    if (value) {
      onSetTime(todoId, value);
    } else {
      onDeleteTime(todoId);
    }
  };

  const handleChangeDate = (todo: TodoItem) => {
    setNewDate(todo.date);
    setShowDatePicker(todo.id);
    setOpenMenuId(null);
  };

  const handleSaveDate = (todoId: string) => {
    if (newDate) {
      onChangeDate(todoId, newDate);
    }
    setShowDatePicker(null);
    setNewDate('');
  };

  const handleDuplicateToday = (todo: TodoItem) => {
    duplicateTodoToday(todo.id);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleDuplicateToAnotherDay = (todo: TodoItem) => {
    setShowDuplicateDatePicker(todo.id);
    setDuplicateTargetDate(selectedDate);
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleSaveDuplicateDate = (todoId: string) => {
    if (duplicateTargetDate) {
      duplicateTodoToDate(todoId, duplicateTargetDate);
    }
    setShowDuplicateDatePicker(null);
    setDuplicateTargetDate('');
  };

  return (
    <div
      className={`category-box ${dropTargetCategoryId === category.id ? 'dropping-target' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem) {
          const draggedTodo = allTodos.find(t => t.id === draggedItem);
          // 다른 영역으로 드래그하는 경우에만 표시 (미분류 포함)
          if (draggedTodo) {
            // null을 문자열로 변환하여 비교
            const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
            const currentCategoryId = category.id === 'uncategorized' ? 'uncategorized' : category.id;
            if (draggedCategoryId !== currentCategoryId) {
              setDropTargetCategoryId(category.id);
            }
          }
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        // 자식 요소로 이동한 경우는 제외
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        if (
          x < rect.left ||
          x > rect.right ||
          y < rect.top ||
          y > rect.bottom
        ) {
          setDropTargetCategoryId(null);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem) {
          const draggedTodo = allTodos.find(t => t.id === draggedItem);
          if (draggedTodo) {
            // null을 문자열로 변환하여 비교
            const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
            const currentCategoryId = category.id === 'uncategorized' ? 'uncategorized' : category.id;
            // 다른 카테고리로 드래그하는 경우에만 표시
            if (draggedCategoryId !== currentCategoryId) {
              setDropTargetCategoryId(category.id);
            }
          }
        }
        if (onDragOver) onDragOver(e);
      }}
      onDrop={(e) => {
        console.log('🎯 DROP EVENT FIRED! CategoryBox onDrop');
        e.preventDefault();
        e.stopPropagation();
        
        // dataTransfer에서도 ID 가져오기 (fallback)
        let todoId = draggedItem;
        if (!todoId) {
          const data = e.dataTransfer.getData('text/plain');
          if (data.startsWith('todo:')) {
            todoId = data.replace('todo:', '');
            console.log(`  - dataTransfer에서 ID 추출: ${todoId}`);
          }
        }
        
        // 미분류는 null로 처리 (category.id가 'uncategorized'인 경우)
        const targetCategoryId = category.id === 'uncategorized' ? null : category.id;
        console.log(`  - categoryId=${category.id}, targetCategoryId=${targetCategoryId || 'null (미분류)'}, draggedItem=${draggedItem}, todoId=${todoId}`);
        setDropTargetCategoryId(null);
        
        if (todoId) {
          const draggedTodo = allTodos.find(t => t.id === todoId);
          if (draggedTodo) {
            const currentCategoryId = draggedTodo.categoryId || 'uncategorized';
            const targetCategoryIdForCompare = category.id === 'uncategorized' ? 'uncategorized' : category.id;
            console.log(`  - 드래그된 할 일: ${draggedTodo.text}, 현재 categoryId: ${currentCategoryId}, 목표 categoryId: ${targetCategoryIdForCompare}`);
            if (currentCategoryId !== targetCategoryIdForCompare) {
              console.log(`  ✅ 다른 영역으로 이동 실행`);
              onDrop(e, targetCategoryId || 'uncategorized');
            } else {
              console.log(`  ⚠️ 같은 영역이므로 이동하지 않음`);
            }
          } else {
            console.log(`  ❌ 드래그된 할 일을 찾을 수 없음 (ID: ${todoId})`);
          }
        } else {
          console.log(`  ❌ draggedItem과 dataTransfer 모두에서 ID를 가져올 수 없음`);
        }
      }}
    >
      <h3 className="category-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="category-color-indicator" style={{ backgroundColor: category.color }}></span>
        <span>{category.name}</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginLeft: 'auto' }}>
          {onOrganizeTodosInCategory && (
            <button 
              className="category-add-btn" 
              onClick={() => onOrganizeTodosInCategory(category.id, selectedDate)}
              title="완료된 할 일을 맨 아래로 정리"
              style={{ fontSize: '14px', padding: '0 4px' }}
            >
              <ArrowUpDown size={14} />
            </button>
          )}
          {onShowInput && (
            <button className="category-add-btn" onClick={onShowInput}>
              +
            </button>
          )}
        </div>
      </h3>
      {showInput && (
        <div className="todo-input-container-expanded">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyPress={onKeyPress}
            onBlur={() => {
              if (!newTodoText.trim()) {
                onHideInput();
              }
            }}
            placeholder="새 할 일 추가..."
            className="todo-input"
            autoFocus
          />
          <button onClick={onAdd} className="todo-add-btn" aria-label="추가">
            +
          </button>
          <button onClick={onHideInput} className="todo-cancel-btn" aria-label="취소">
            ×
          </button>
        </div>
      )}
      <div 
        className="todos-list"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedItem && todos.length === 0) {
            // 빈 리스트에서 드래그 오버 시
            const draggedTodo = allTodos.find(t => t.id === draggedItem);
            if (draggedTodo) {
              // null을 문자열로 변환하여 비교
              const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
              const currentCategoryId = category.id === 'uncategorized' ? 'uncategorized' : category.id;
              if (draggedCategoryId !== currentCategoryId) {
                setDropTargetCategoryId(category.id);
              }
            }
          }
          if (onDragOver) onDragOver(e);
        }}
        onDrop={(e) => {
          console.log('📋 DROP EVENT FIRED! todos-list onDrop (CategoryTab)');
          e.preventDefault();
          e.stopPropagation();
          
          // dataTransfer에서도 ID 가져오기 (fallback)
          let todoId = draggedItem;
          if (!todoId) {
            const data = e.dataTransfer.getData('text/plain');
            if (data.startsWith('todo:')) {
              todoId = data.replace('todo:', '');
              console.log(`  - dataTransfer에서 ID 추출: ${todoId}`);
            }
          }
          
          // 미분류는 null로 처리
          const targetCategoryId = category.id === 'uncategorized' ? null : category.id;
          console.log(`  - categoryId=${category.id}, targetCategoryId=${targetCategoryId || 'null (미분류)'}, draggedItem=${draggedItem}, todoId=${todoId}, todos.length=${todos.length}`);
          
          // 시각적 피드백 제거 (에러 방지를 위해 try-catch로 감쌈)
          try {
            setDropTargetCategoryId(null);
            setDropTargetPosition(null);
          } catch (error) {
            console.warn('setDropTargetCategoryId 호출 실패:', error);
          }
          
          // 빈 리스트에 드롭
          if (todoId && todos.length === 0) {
            const draggedTodo = allTodos.find(t => t.id === todoId);
            if (draggedTodo) {
              const currentCategoryId = draggedTodo.categoryId || 'uncategorized';
              const targetCategoryIdForCompare = category.id === 'uncategorized' ? 'uncategorized' : category.id;
              console.log(`  - 빈 리스트에 드롭: ${draggedTodo.text}, 현재 categoryId: ${currentCategoryId}, 목표 categoryId: ${targetCategoryIdForCompare}`);
              if (currentCategoryId !== targetCategoryIdForCompare) {
                console.log(`  ✅ 빈 리스트로 이동 실행`);
                onDrop(e, targetCategoryId || 'uncategorized');
              }
            }
          } else if (todoId && todos.length > 0) {
            // 아이템이 있는 리스트에도 드롭 가능하도록
            const draggedTodo = allTodos.find(t => t.id === todoId);
            if (draggedTodo) {
              const currentCategoryId = draggedTodo.categoryId || 'uncategorized';
              const targetCategoryIdForCompare = category.id === 'uncategorized' ? 'uncategorized' : category.id;
              console.log(`  - 아이템이 있는 리스트에 드롭: ${draggedTodo.text}, 현재 categoryId: ${currentCategoryId}, 목표 categoryId: ${targetCategoryIdForCompare}`);
              if (currentCategoryId !== targetCategoryIdForCompare) {
                console.log(`  ✅ 다른 영역으로 이동 실행`);
                onDrop(e, targetCategoryId || 'uncategorized');
              }
            }
          }
        }}
      >
        {todos.map((todo, index) => {
          const isDropTarget = dropTargetId === todo.id;
          const prevTodo = index > 0 ? todos[index - 1] : null;
          const nextTodo = index < todos.length - 1 ? todos[index + 1] : null;
          const isPrevDropTarget = prevTodo && dropTargetId === prevTodo.id && dropTargetPosition === 'bottom';
          const isNextDropTarget = nextTodo && dropTargetId === nextTodo.id && dropTargetPosition === 'top';
          
          return (
          <div 
            key={todo.id} 
            className="todo-item-wrapper"
            style={{
              marginTop: isDropTarget && dropTargetPosition === 'top' ? '15px' : 
                        isPrevDropTarget ? '15px' : undefined,
              marginBottom: isDropTarget && dropTargetPosition === 'bottom' ? '15px' : 
                           isNextDropTarget ? '15px' : undefined,
              transition: 'margin 0.2s ease',
            }}
          >
            <div
              className={`todo-item ${dropTargetId === todo.id ? 'dropping-target' : ''}`}
              draggable
              onDragStart={(e) => {
                // 옵션 메뉴가 열려있으면 드래그 방지
                if (openMenuId === todo.id) {
                  e.preventDefault();
                  return;
                }
                onDragStart(e, todo.id);
              }}
              onDragEnd={() => {
                if (onDragEnd) onDragEnd();
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedItem && draggedItem !== todo.id) {
                  const draggedTodo = allTodos.find(t => t.id === draggedItem);
                  if (draggedTodo) {
                    // 같은 categoryId인 경우에만 dropTargetId 설정 (순서 변경용)
                    // null 처리를 위해 문자열로 변환하여 비교
                    const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
                    const todoCategoryId = todo.categoryId || 'uncategorized';
                    if (draggedCategoryId === todoCategoryId) {
                      setDropTargetId(todo.id);
                    }
                  }
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropTargetPosition(null);
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX;
                const y = e.clientY;
                if (
                  x < rect.left ||
                  x > rect.right ||
                  y < rect.top ||
                  y > rect.bottom
                ) {
                  setDropTargetId(null);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedItem && draggedItem !== todo.id) {
                  const draggedTodo = allTodos.find(t => t.id === draggedItem);
                  if (draggedTodo) {
                    // 같은 categoryId인 경우에만 순서 변경 표시 (더 엄격한 조건)
                    // null 처리를 위해 문자열로 변환하여 비교
                    const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
                    const todoCategoryId = todo.categoryId || 'uncategorized';
                    if (draggedCategoryId === todoCategoryId) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY;
                      const midpoint = rect.top + rect.height / 2;
                      // 마우스가 아이템의 위쪽 절반에 있으면 위쪽에, 아래쪽 절반에 있으면 아래쪽에 드롭
                      setDropTargetPosition(y < midpoint ? 'top' : 'bottom');
                      setDropTargetId(todo.id);
                    }
                  }
                }
                if (onDragOver) onDragOver(e);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropTargetId(null);
                setDropTargetPosition(null);
                if (draggedItem && draggedItem !== todo.id && onReorderTodo) {
                  const draggedTodo = allTodos.find(t => t.id === draggedItem);
                  if (draggedTodo) {
                    // 같은 categoryId인 경우에만 순서 변경 (null 처리 포함)
                    const draggedCategoryId = draggedTodo.categoryId || 'uncategorized';
                    const todoCategoryId = todo.categoryId || 'uncategorized';
                    if (draggedCategoryId === todoCategoryId) {
                      // categoryId가 null이면 'uncategorized' 문자열로 전달
                      const categoryIdForReorder = todo.categoryId || 'uncategorized';
                      onReorderTodo(draggedItem, todo.id, categoryIdForReorder);
                    }
                  }
                }
              }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
                className="todo-checkbox acorn-checkbox"
                style={{ '--acorn-color': category.color } as React.CSSProperties}
              />
              {editingTodoId === todo.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleSaveEdit(todo.id)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(todo.id);
                    }
                  }}
                  className="todo-edit-input"
                  autoFocus
                />
              ) : (
                <span
                  className={`todo-text ${todo.completed ? 'completed' : ''}`}
                  onClick={() => onToggle(todo.id)}
                >
                  {todo.text}
                </span>
              )}
              <button
                className="focus-marker-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTodayFocus(todo.id);
                }}
                title={todo.isTodayFocus ? "Daily Focus에서 제거" : "Daily Focus에 추가"}
              >
                {todo.isTodayFocus ? (
                  <span key={`active-${todo.id}`} className="focus-icon-wrapper active">
                    <Dog size={18} className="focus-icon focus-icon-active" />
                  </span>
                ) : (
                  <span key={`inactive-${todo.id}`} className="focus-icon-wrapper inactive">
                    <Bone size={18} className="focus-icon focus-icon-inactive" />
                  </span>
                )}
              </button>
              <div className="todo-options" ref={menuRef} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="todo-options-btn" 
                  onClick={(e) => handleMenuClick(todo.id, e)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  aria-label="옵션"
                >
                  ⋮
                </button>
                {openMenuId === todo.id && menuPosition && (
                  <div 
                    className="todo-options-menu"
                    style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(todo);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}>수정</button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      onDelete(todo.id);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}>삭제</button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleChangeDate(todo);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}>날짜 변경</button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleAddMemo(todo);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}>메모</button>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      handleSetTime(todo);
                      setOpenMenuId(null);
                      setMenuPosition(null);
                    }}>시간 설정</button>
                    {todo.completed && (
                      <>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateToday(todo);
                        }}>오늘 또 하기</button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateToAnotherDay(todo);
                        }}>다른 날 또 하기</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {(todo.time || todo.memo) && (
              <div className="todo-meta">
                {todo.time && (
                  <span className="todo-time-inline">{todo.time}</span>
                )}
                {todo.memo && (
                  <span className="todo-memo-inline">{todo.memo}</span>
                )}
              </div>
            )}
            {showDatePicker === todo.id && (
              <div className="date-picker">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="date-input"
                />
                <div className="date-actions">
                  <button onClick={() => handleSaveDate(todo.id)}>확인</button>
                  <button onClick={() => {
                    setShowDatePicker(null);
                    setNewDate('');
                  }}>취소</button>
                </div>
              </div>
            )}
            {showDuplicateDatePicker === todo.id && (
              <div className="date-picker">
                <input
                  type="date"
                  value={duplicateTargetDate}
                  onChange={(e) => setDuplicateTargetDate(e.target.value)}
                  className="date-input"
                />
                <div className="date-actions">
                  <button onClick={() => handleSaveDuplicateDate(todo.id)}>확인</button>
                  <button onClick={() => {
                    setShowDuplicateDatePicker(null);
                    setDuplicateTargetDate('');
                  }}>취소</button>
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
      {showMemoBottomSheet && (() => {
        const todo = todos.find(t => t.id === showMemoBottomSheet);
        return todo ? (
          <MemoTimeBottomSheet
            isOpen={true}
            onClose={() => setShowMemoBottomSheet(null)}
            type="memo"
            initialValue={todo.memo || ''}
            onSave={(value) => handleSaveMemo(showMemoBottomSheet, value)}
            onDelete={() => onDeleteMemo(showMemoBottomSheet)}
          />
        ) : null;
      })()}
      {showTimeBottomSheet && (() => {
        const todo = todos.find(t => t.id === showTimeBottomSheet);
        return todo ? (
          <MemoTimeBottomSheet
            isOpen={true}
            onClose={() => setShowTimeBottomSheet(null)}
            type="time"
            initialValue={todo.time || ''}
            onSave={(value) => handleSaveTime(showTimeBottomSheet, value)}
            onDelete={() => onDeleteTime(showTimeBottomSheet)}
          />
        ) : null;
      })()}
    </div>
  );
}