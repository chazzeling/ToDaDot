import { useState, useRef, useEffect } from 'react';
import { TodoItem, Quadrant } from '../types';
import { useQuadrantColors, ColorPreset, COLOR_PRESETS } from '../hooks/useQuadrantColors';
import MemoTimeBottomSheet from './MemoTimeBottomSheet';
import { Palette, Bookmark, BookmarkCheck, Bone, Dog, ArrowUpDown, ListTodo, BadgePlus } from 'lucide-react';
import './QuadrantTab.css';

interface QuadrantTabProps {
  todos: TodoItem[];
  allTodos: TodoItem[]; // 모든 날짜의 todos (드롭 로직용)
  selectedDate: string;
  onAddTodo: (quadrant: Quadrant, text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onMoveTodo: (id: string, newQuadrant: Quadrant) => void;
  onReorderTodo?: (draggedId: string, targetId: string, quadrant: Quadrant) => void;
  onOrganizeTodosInQuadrant: (quadrant: Quadrant, date: string) => Promise<void>;
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

// QuadrantTab.tsx 상단 부분 수정

const quadrantLabels: Record<Quadrant, { title: string; shortTitle: string }> = {
  'urgent-important': { title: 'Do', shortTitle: 'Do' },
  'not-urgent-important': { title: 'Plan', shortTitle: 'Plan' },
  'urgent-not-important': { title: 'Delegate', shortTitle: 'Delegate' },
  'not-urgent-not-important': { title: 'Delete', shortTitle: 'Delete' },
  'uncategorized': { title: '미분류', shortTitle: '미분류' },
};

export default function QuadrantTab({
  todos,
  allTodos,
  selectedDate,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onMoveTodo,
  onReorderTodo,
  onOrganizeTodosInQuadrant,
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
}: QuadrantTabProps) {
  const { colors, preset, updatePreset } = useQuadrantColors();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropTargetQuadrant, setDropTargetQuadrant] = useState<Quadrant | null>(null);
  const [dropTargetPosition, setDropTargetPosition] = useState<'top' | 'bottom' | null>(null);
  const [newTodoTexts, setNewTodoTexts] = useState<Record<Quadrant, string>>({
    'urgent-important': '',
    'not-urgent-important': '',
    'urgent-not-important': '',
    'not-urgent-not-important': '',
    'uncategorized': '',
  });
  const [showInputForQuadrant, setShowInputForQuadrant] = useState<Quadrant | null>(null);
  const [showColorPresetModal, setShowColorPresetModal] = useState(false);
  const [showTodoManageModal, setShowTodoManageModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTargetDate, setSelectedTargetDate] = useState<string>('');
  const [deleteIncompleteConfirm, setDeleteIncompleteConfirm] = useState(false);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const handleAddTodo = (quadrant: Quadrant) => {
    const text = newTodoTexts[quadrant].trim();
    if (text) {
      onAddTodo(quadrant, text);
      setNewTodoTexts({ ...newTodoTexts, [quadrant]: '' });
      setShowInputForQuadrant(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, quadrant: Quadrant) => {
    if (e.key === 'Enter') {
      handleAddTodo(quadrant);
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
    setDropTargetQuadrant(null);
    setDropTargetPosition(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, quadrant: Quadrant) => {
    console.log('📦 DROP EVENT FIRED! QuadrantTab handleDrop');
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
    
    console.log(`  - quadrant=${quadrant}, draggedItem=${draggedItem}, todoId=${todoId}`);
    setDropTargetQuadrant(null);
    
    if (todoId) {
      // allTodos에서 찾기 (현재 날짜뿐만 아니라 모든 할 일)
      const draggedTodo = allTodos.find(t => t.id === todoId);
      if (draggedTodo) {
        console.log(`  - 드래그된 할 일: ${draggedTodo.text}, 현재 quadrant: ${draggedTodo.quadrant || 'null'}, 목표 quadrant: ${quadrant}`);
        const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
        if (draggedQuadrant === quadrant) {
          // 같은 영역 내 순서 변경은 todo 아이템의 onDrop에서 처리
          console.log(`  ⚠️ 같은 영역이므로 순서 변경은 todo 아이템에서 처리`);
          return;
        }
        // 다른 영역으로 이동
        console.log(`  ✅ 다른 영역으로 이동 실행: onMoveTodo(${todoId}, ${quadrant})`);
        onMoveTodo(todoId, quadrant);
        setDraggedItem(null);
      } else {
        console.log(`  ❌ 드래그된 할 일을 찾을 수 없음 (allTodos에서 검색, ID: ${todoId})`);
      }
    } else {
      console.log(`  ❌ draggedItem과 dataTransfer 모두에서 ID를 가져올 수 없음`);
    }
  };

  const getTodosByQuadrant = (quadrant: Quadrant) => {
    if (quadrant === 'uncategorized') {
      // 미분류: quadrant가 없거나 'uncategorized'인 경우
      const filtered = todos.filter((todo) => !todo.quadrant || todo.quadrant === 'uncategorized');
      return filtered.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
    }
    const filtered = todos.filter((todo) => todo.quadrant === quadrant);
    return filtered.sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  };

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
    <div className="quadrant-tab">
      <div className="tab-header">
        <div className="tab-title-container">
          <h2>Eisenhower Matrix</h2>
          <button 
            className="palette-icon-btn" 
            onClick={() => setShowColorPresetModal(true)}
            title="컬러 세트 선택"
          >
            <Palette size={18} color="var(--text-primary)" />
          </button>
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

      {showColorPresetModal && (
        <ColorPresetModal
          currentPreset={preset}
          onSelectPreset={(preset) => {
            updatePreset(preset);
            setShowColorPresetModal(false);
          }}
          onClose={() => setShowColorPresetModal(false)}
        />
      )}

      <div className="quadrant-grid">
        {/* 긴급하고 중요함 */}
        <QuadrantBox
          quadrant="urgent-important"
          todos={getTodosByQuadrant('urgent-important')}
          newTodoText={newTodoTexts['urgent-important']}
          showInput={showInputForQuadrant === 'urgent-important'}
          color={colors['urgent-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'urgent-important': text })
          }
          onAdd={() => handleAddTodo('urgent-important')}
          onKeyPress={(e) => handleKeyPress(e, 'urgent-important')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForQuadrant('urgent-important')}
          onHideInput={() => setShowInputForQuadrant(null)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInQuadrant={onOrganizeTodosInQuadrant}
          selectedDate={selectedDate}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetQuadrant={dropTargetQuadrant}
          setDropTargetQuadrant={setDropTargetQuadrant}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          onToggleTodayFocus={onToggleTodayFocus}
          duplicateTodoToday={duplicateTodoToday}
          duplicateTodoToDate={duplicateTodoToDate}
        />

        {/* 중요하지만 긴급하지 않음 */}
        <QuadrantBox
          quadrant="not-urgent-important"
          todos={getTodosByQuadrant('not-urgent-important')}
          newTodoText={newTodoTexts['not-urgent-important']}
          showInput={showInputForQuadrant === 'not-urgent-important'}
          color={colors['not-urgent-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'not-urgent-important': text })
          }
          onAdd={() => handleAddTodo('not-urgent-important')}
          onKeyPress={(e) => handleKeyPress(e, 'not-urgent-important')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForQuadrant('not-urgent-important')}
          onHideInput={() => setShowInputForQuadrant(null)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInQuadrant={onOrganizeTodosInQuadrant}
          selectedDate={selectedDate}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetQuadrant={dropTargetQuadrant}
          setDropTargetQuadrant={setDropTargetQuadrant}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          onToggleTodayFocus={onToggleTodayFocus}
          duplicateTodoToday={duplicateTodoToday}
          duplicateTodoToDate={duplicateTodoToDate}
        />

        {/* 긴급하지만 중요하지 않음 */}
        <QuadrantBox
          quadrant="urgent-not-important"
          todos={getTodosByQuadrant('urgent-not-important')}
          newTodoText={newTodoTexts['urgent-not-important']}
          showInput={showInputForQuadrant === 'urgent-not-important'}
          color={colors['urgent-not-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'urgent-not-important': text })
          }
          onAdd={() => handleAddTodo('urgent-not-important')}
          onKeyPress={(e) => handleKeyPress(e, 'urgent-not-important')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForQuadrant('urgent-not-important')}
          onHideInput={() => setShowInputForQuadrant(null)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInQuadrant={onOrganizeTodosInQuadrant}
          selectedDate={selectedDate}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetQuadrant={dropTargetQuadrant}
          setDropTargetQuadrant={setDropTargetQuadrant}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          onToggleTodayFocus={onToggleTodayFocus}
          duplicateTodoToday={duplicateTodoToday}
          duplicateTodoToDate={duplicateTodoToDate}
        />

        {/* 중요하지도 긴급하지도 않음 */}
        <QuadrantBox
          quadrant="not-urgent-not-important"
          todos={getTodosByQuadrant('not-urgent-not-important')}
          newTodoText={newTodoTexts['not-urgent-not-important']}
          showInput={showInputForQuadrant === 'not-urgent-not-important'}
          color={colors['not-urgent-not-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'not-urgent-not-important': text })
          }
          onAdd={() => handleAddTodo('not-urgent-not-important')}
          onKeyPress={(e) => handleKeyPress(e, 'not-urgent-not-important')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForQuadrant('not-urgent-not-important')}
          onHideInput={() => setShowInputForQuadrant(null)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInQuadrant={onOrganizeTodosInQuadrant}
          selectedDate={selectedDate}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetQuadrant={dropTargetQuadrant}
          setDropTargetQuadrant={setDropTargetQuadrant}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          onToggleTodayFocus={onToggleTodayFocus}
          duplicateTodoToday={duplicateTodoToday}
          duplicateTodoToDate={duplicateTodoToDate}
        />
      </div>

      {/* 미분류 */}
      <div className="uncategorized-section">
        <QuadrantBox
          quadrant="uncategorized"
          todos={getTodosByQuadrant('uncategorized')}
          newTodoText={newTodoTexts['uncategorized']}
          showInput={showInputForQuadrant === 'uncategorized'}
          color={colors['uncategorized']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, uncategorized: text })
          }
          onAdd={() => handleAddTodo('uncategorized')}
          onKeyPress={(e) => handleKeyPress(e, 'uncategorized')}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
          onShowInput={() => setShowInputForQuadrant('uncategorized')}
          onHideInput={() => setShowInputForQuadrant(null)}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          onReorderTodo={onReorderTodo}
          onOrganizeTodosInQuadrant={onOrganizeTodosInQuadrant}
          selectedDate={selectedDate}
          draggedItem={draggedItem}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          dropTargetQuadrant={dropTargetQuadrant}
          setDropTargetQuadrant={setDropTargetQuadrant}
          dropTargetPosition={dropTargetPosition}
          setDropTargetPosition={setDropTargetPosition}
          allTodos={allTodos}
          onEditTodo={onEditTodo}
          onChangeDate={onChangeDate}
          onUpdateMemo={onUpdateMemo}
          onDeleteMemo={onDeleteMemo}
          onSetTime={onSetTime}
          onDeleteTime={onDeleteTime}
          onToggleTodayFocus={onToggleTodayFocus}
          duplicateTodoToday={duplicateTodoToday}
          duplicateTodoToDate={duplicateTodoToDate}
        />
      </div>

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

      {/* 미완료 항목 삭제 확인 모달 */}
      {deleteIncompleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteIncompleteConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>미완료 항목 삭제</h3>
            <p>미완료된 항목을 정말 삭제할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteIncompleteConfirm(false)}>
                취소
              </button>
              <button className="modal-confirm" onClick={confirmDeleteIncomplete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 항목 삭제 확인 모달 */}
      {deleteAllConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteAllConfirm(false)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>전체 항목 삭제</h3>
            <p>모든 항목을 정말 삭제할까요?</p>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setDeleteAllConfirm(false)}>
                취소
              </button>
              <button className="modal-confirm" onClick={confirmDeleteAll}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

interface QuadrantBoxProps {
  quadrant: Quadrant;
  todos: TodoItem[];
  newTodoText: string;
  showInput: boolean;
  color: string;
  onTextChange: (text: string) => void;
  onAdd: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onShowInput: () => void;
  onHideInput: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, quadrant: Quadrant) => void;
  onDragEnd?: () => void;
  onReorderTodo?: (draggedId: string, targetId: string, quadrant: Quadrant) => void;
  onOrganizeTodosInQuadrant?: (quadrant: Quadrant, date: string) => Promise<void>;
  selectedDate: string;
  draggedItem: string | null;
  dropTargetId: string | null;
  setDropTargetId: (id: string | null) => void;
  dropTargetQuadrant: Quadrant | null;
  setDropTargetQuadrant: (quadrant: Quadrant | null) => void;
  dropTargetPosition: 'top' | 'bottom' | null;
  setDropTargetPosition: (position: 'top' | 'bottom' | null) => void;
  allTodos: TodoItem[];
  onEditTodo: (id: string, text: string) => void;
  onChangeDate: (id: string, newDate: string) => void;
  onUpdateMemo: (id: string, memo: string) => void;
  onDeleteMemo: (id: string) => void;
  onSetTime: (id: string, time: string) => void;
  onDeleteTime: (id: string) => void;
  onToggleTodayFocus: (id: string) => void;
}

interface ColorPresetModalProps {
  currentPreset: ColorPreset;
  onSelectPreset: (preset: ColorPreset) => void;
  onClose: () => void;
}

function QuadrantBox({
  quadrant,
  todos,
  newTodoText,
  showInput,
  color,
  onTextChange,
  onAdd,
  onKeyPress,
  onToggle,
  onDelete,
  onShowInput,
  onHideInput,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onReorderTodo,
  onOrganizeTodosInQuadrant,
  selectedDate,
  draggedItem,
  dropTargetId,
  setDropTargetId,
  dropTargetQuadrant,
  setDropTargetQuadrant,
  dropTargetPosition,
  setDropTargetPosition,
  allTodos,
  onEditTodo,
  onChangeDate,
  onUpdateMemo,
  onDeleteMemo,
  onSetTime,
  onDeleteTime,
  onToggleTodayFocus,
  duplicateTodoToday,
  duplicateTodoToDate,
}: QuadrantBoxProps) {
  const { title } = quadrantLabels[quadrant];
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

  return (
    <div
      className={`quadrant-box ${dropTargetQuadrant === quadrant ? 'dropping-target' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem) {
          const draggedTodo = allTodos.find(t => t.id === draggedItem);
          // 다른 영역으로 드래그하는 경우에만 표시 (미분류 포함)
          if (draggedTodo) {
            const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
            if (draggedQuadrant !== quadrant) {
              setDropTargetQuadrant(quadrant);
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
          setDropTargetQuadrant(null);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem) {
          const draggedTodo = allTodos.find(t => t.id === draggedItem);
          if (draggedTodo) {
            const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
            // 다른 영역으로 드래그하는 경우에만 표시
            if (draggedQuadrant !== quadrant) {
              setDropTargetQuadrant(quadrant);
            }
          }
        }
        if (onDragOver) onDragOver(e);
      }}
      onDrop={(e) => {
        console.log('🎯 DROP EVENT FIRED! QuadrantBox onDrop');
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
        
        console.log(`  - quadrant=${quadrant}, draggedItem=${draggedItem}, todoId=${todoId}`);
        setDropTargetQuadrant(null);
        
        if (todoId) {
          const draggedTodo = allTodos.find(t => t.id === todoId);
          if (draggedTodo) {
            const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
            console.log(`  - 드래그된 할 일: ${draggedTodo.text}, 현재 quadrant: ${draggedQuadrant}, 목표 quadrant: ${quadrant}`);
            if (draggedQuadrant !== quadrant) {
              console.log(`  ✅ 다른 영역으로 이동 실행`);
              onDrop(e, quadrant);
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
      <div className="quadrant-title-container">
        <h3 className="quadrant-title">{title}</h3>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {onOrganizeTodosInQuadrant && (
            <button 
              className="quadrant-add-btn" 
              onClick={() => onOrganizeTodosInQuadrant(quadrant, selectedDate)}
              title="완료된 할 일을 맨 아래로 정리"
              style={{ fontSize: '14px', padding: '0 4px' }}
            >
              <ArrowUpDown size={14} />
            </button>
          )}
          {onShowInput && (
            <button className="quadrant-add-btn" onClick={onShowInput}>
              +
            </button>
          )}
        </div>
      </div>
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
            if (draggedTodo && draggedTodo.quadrant !== quadrant) {
              setDropTargetQuadrant(quadrant);
            }
          }
          if (onDragOver) onDragOver(e);
        }}
        onDrop={(e) => {
          console.log('📋 DROP EVENT FIRED! todos-list onDrop');
          e.preventDefault();
          e.stopPropagation();
          console.log(`  - quadrant=${quadrant}, draggedItem=${draggedItem}, todos.length=${todos.length}`);
          setDropTargetQuadrant(null);
          setDropTargetPosition(null);
          // 빈 리스트에 드롭
          if (draggedItem && todos.length === 0) {
            const draggedTodo = allTodos.find(t => t.id === draggedItem);
            if (draggedTodo) {
              const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
              console.log(`  - 빈 리스트에 드롭: ${draggedTodo.text}, 현재 quadrant: ${draggedQuadrant}, 목표 quadrant: ${quadrant}`);
              if (draggedQuadrant !== quadrant) {
                console.log(`  ✅ 빈 리스트로 이동 실행`);
                onDrop(e, quadrant);
              }
            }
          } else if (draggedItem && todos.length > 0) {
            // 아이템이 있는 리스트에도 드롭 가능하도록
            const draggedTodo = allTodos.find(t => t.id === draggedItem);
            if (draggedTodo) {
              const draggedQuadrant = draggedTodo.quadrant || 'uncategorized';
              console.log(`  - 아이템이 있는 리스트에 드롭: ${draggedTodo.text}, 현재 quadrant: ${draggedQuadrant}, 목표 quadrant: ${quadrant}`);
              if (draggedQuadrant !== quadrant) {
                console.log(`  ✅ 다른 영역으로 이동 실행`);
                onDrop(e, quadrant);
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
                  if (draggedTodo && draggedTodo.quadrant === todo.quadrant) {
                    setDropTargetId(todo.id);
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
                    // 같은 quadrant인 경우에만 순서 변경 표시 (더 엄격한 조건)
                    if (draggedTodo.quadrant === todo.quadrant) {
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
                  if (draggedTodo && draggedTodo.quadrant === todo.quadrant) {
                    onReorderTodo(draggedItem, todo.id, todo.quadrant!);
                  }
                }
              }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
                className="todo-checkbox acorn-checkbox"
                style={{ '--acorn-color': color } as React.CSSProperties}
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

function ColorPresetModal({ currentPreset, onSelectPreset, onClose }: ColorPresetModalProps) {
  const presets: { key: ColorPreset; name: string; description: string }[] = [
    { key: 'spring', name: '봄', description: '선명하게 돋아나는 계절' },
    { key: 'summer', name: '여름', description: '청명하게 내리쬐는 계절' },
    { key: 'autumn', name: '가을', description: '평온하게 익어가는 계절' },
    { key: 'winter', name: '겨울', description: '조용하게 저물어가는 계절' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content color-preset-modal" onClick={(e) => e.stopPropagation()}>
        <h3>컬러 세트 선택</h3>
        <div className="preset-list">
          {presets.map((preset) => (
            <div
              key={preset.key}
              className={`preset-item ${currentPreset === preset.key ? 'selected' : ''}`}
              onClick={() => onSelectPreset(preset.key)}
            >
              <div className="preset-header">
                <span className="preset-name">{preset.name}</span>
                {currentPreset === preset.key && <span className="preset-check">✓</span>}
              </div>
              <p className="preset-description">{preset.description}</p>
              <div className="preset-colors">
                <div className="preset-color-box" style={{ backgroundColor: COLOR_PRESETS[preset.key]['urgent-important'] }}>
                  <span>DO</span>
                </div>
                <div className="preset-color-box" style={{ backgroundColor: COLOR_PRESETS[preset.key]['not-urgent-important'] }}>
                  <span>PLAN</span>
                </div>
                <div className="preset-color-box" style={{ backgroundColor: COLOR_PRESETS[preset.key]['urgent-not-important'] }}>
                  <span>DELEGATE</span>
                </div>
                <div className="preset-color-box" style={{ backgroundColor: COLOR_PRESETS[preset.key]['not-urgent-not-important'] }}>
                  <span>DELETE</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}