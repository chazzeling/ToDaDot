import { useState, useEffect } from 'react';
import { TodoItem, Quadrant } from '../types';
import './EisenhowerMatrix.css';

interface EisenhowerMatrixProps {
  todos: Record<Quadrant, TodoItem[]>;
  onAddTodo: (quadrant: Quadrant, text: string) => void;
  onToggleTodo: (quadrant: Quadrant, id: string) => void;
  onDeleteTodo: (quadrant: Quadrant, id: string) => void;
}

const quadrantLabels: Record<Quadrant, { title: string; color: string }> = {
  'urgent-important': { title: '긴급하고 중요함', color: '#ff6b6b' },
  'not-urgent-important': { title: '중요하지만 긴급하지 않음', color: '#4ecdc4' },
  'urgent-not-important': { title: '긴급하지만 중요하지 않음', color: '#ffe66d' },
  'not-urgent-not-important': { title: '중요하지도 긴급하지도 않음', color: '#95e1d3' },
};

export default function EisenhowerMatrix({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
}: EisenhowerMatrixProps) {
  const [newTodoTexts, setNewTodoTexts] = useState<Record<Quadrant, string>>({
    'urgent-important': '',
    'not-urgent-important': '',
    'urgent-not-important': '',
    'not-urgent-not-important': '',
  });

  const handleAddTodo = (quadrant: Quadrant) => {
    const text = newTodoTexts[quadrant].trim();
    if (text) {
      onAddTodo(quadrant, text);
      setNewTodoTexts({ ...newTodoTexts, [quadrant]: '' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, quadrant: Quadrant) => {
    if (e.key === 'Enter') {
      handleAddTodo(quadrant);
    }
  };

  return (
    <div className="eisenhower-matrix">
      <div className="matrix-header">
        <div className="header-label urgent">긴급함</div>
        <div className="header-label not-urgent">긴급하지 않음</div>
      </div>
      <div className="matrix-grid">
        {/* 긴급하고 중요함 */}
        <QuadrantBox
          quadrant="urgent-important"
          todos={todos['urgent-important']}
          newTodoText={newTodoTexts['urgent-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'urgent-important': text })
          }
          onAdd={() => handleAddTodo('urgent-important')}
          onKeyPress={(e) => handleKeyPress(e, 'urgent-important')}
          onToggle={(id) => onToggleTodo('urgent-important', id)}
          onDelete={(id) => onDeleteTodo('urgent-important', id)}
        />

        {/* 중요하지만 긴급하지 않음 */}
        <QuadrantBox
          quadrant="not-urgent-important"
          todos={todos['not-urgent-important']}
          newTodoText={newTodoTexts['not-urgent-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'not-urgent-important': text })
          }
          onAdd={() => handleAddTodo('not-urgent-important')}
          onKeyPress={(e) => handleKeyPress(e, 'not-urgent-important')}
          onToggle={(id) => onToggleTodo('not-urgent-important', id)}
          onDelete={(id) => onDeleteTodo('not-urgent-important', id)}
        />

        {/* 긴급하지만 중요하지 않음 */}
        <QuadrantBox
          quadrant="urgent-not-important"
          todos={todos['urgent-not-important']}
          newTodoText={newTodoTexts['urgent-not-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'urgent-not-important': text })
          }
          onAdd={() => handleAddTodo('urgent-not-important')}
          onKeyPress={(e) => handleKeyPress(e, 'urgent-not-important')}
          onToggle={(id) => onToggleTodo('urgent-not-important', id)}
          onDelete={(id) => onDeleteTodo('urgent-not-important', id)}
        />

        {/* 중요하지도 긴급하지도 않음 */}
        <QuadrantBox
          quadrant="not-urgent-not-important"
          todos={todos['not-urgent-not-important']}
          newTodoText={newTodoTexts['not-urgent-not-important']}
          onTextChange={(text) =>
            setNewTodoTexts({ ...newTodoTexts, 'not-urgent-not-important': text })
          }
          onAdd={() => handleAddTodo('not-urgent-not-important')}
          onKeyPress={(e) => handleKeyPress(e, 'not-urgent-not-important')}
          onToggle={(id) => onToggleTodo('not-urgent-not-important', id)}
          onDelete={(id) => onDeleteTodo('not-urgent-not-important', id)}
        />
      </div>
      <div className="matrix-footer">
        <div className="footer-label important">중요함</div>
        <div className="footer-label not-important">중요하지 않음</div>
      </div>
    </div>
  );
}

interface QuadrantBoxProps {
  quadrant: Quadrant;
  todos: TodoItem[];
  newTodoText: string;
  onTextChange: (text: string) => void;
  onAdd: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function QuadrantBox({
  quadrant,
  todos,
  newTodoText,
  onTextChange,
  onAdd,
  onKeyPress,
  onToggle,
  onDelete,
}: QuadrantBoxProps) {
  const { title, color } = quadrantLabels[quadrant];

  return (
    <div className="quadrant-box" style={{ borderColor: color }}>
      <h3 className="quadrant-title" style={{ backgroundColor: color }}>
        {title}
      </h3>
      <div className="todos-list">
        {todos.map((todo) => (
          <div key={todo.id} className="todo-item">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggle(todo.id)}
              className="todo-checkbox"
            />
            <span
              className={`todo-text ${todo.completed ? 'completed' : ''}`}
              onClick={() => onToggle(todo.id)}
            >
              {todo.text}
            </span>
            <button
              className="todo-delete"
              onClick={() => onDelete(todo.id)}
              aria-label="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="todo-input-container">
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="새 할 일 추가..."
          className="todo-input"
        />
        <button onClick={onAdd} className="todo-add-btn" aria-label="추가">
          +
        </button>
      </div>
    </div>
  );
}

