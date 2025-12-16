import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './MonthlyGoalPanel.css';

interface MonthlyGoalPanelProps {
  selectedDate: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MonthlyGoalItem {
  id: string;
  text: string;
  completed: boolean;
}

export default function MonthlyGoalPanel({ 
  selectedDate, 
  isCollapsed = false,
  onToggleCollapse,
}: MonthlyGoalPanelProps) {
  const [goals, setGoals] = useState<MonthlyGoalItem[]>(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: `goal-${i}`,
      text: '',
      completed: false,
    }))
  );

  // 현재 월의 키 생성 (YYYY-MM 형식)
  const getCurrentMonthKey = (date: string): string => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthKey = getCurrentMonthKey(selectedDate);

  // 로드 저장된 목표
  useEffect(() => {
    const saved = localStorage.getItem('monthly-goals');
    if (saved) {
      try {
        const allGoals: Record<string, MonthlyGoalItem[]> = JSON.parse(saved);
        const monthGoals = allGoals[monthKey];
        if (monthGoals && Array.isArray(monthGoals)) {
          // 저장된 목표와 기본 5개 목표 병합
          const mergedGoals = Array.from({ length: 5 }, (_, i) => 
            monthGoals[i] || { id: `goal-${i}`, text: '', completed: false }
          );
          setGoals(mergedGoals);
        }
      } catch (e) {
        console.error('Failed to load monthly goals:', e);
      }
    }
  }, [monthKey]);

  // 목표 저장
  const saveGoals = (updatedGoals: MonthlyGoalItem[]) => {
    const saved = localStorage.getItem('monthly-goals');
    let allGoals: Record<string, MonthlyGoalItem[]> = {};
    if (saved) {
      try {
        allGoals = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse monthly goals:', e);
      }
    }
    allGoals[monthKey] = updatedGoals;
    localStorage.setItem('monthly-goals', JSON.stringify(allGoals));
  };

  const handleGoalChange = (index: number, text: string) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], text };
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const handleGoalToggle = (index: number) => {
    const updatedGoals = [...goals];
    updatedGoals[index] = { ...updatedGoals[index], completed: !updatedGoals[index].completed };
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  if (isCollapsed) {
    return (
      <div className="monthly-goal-wrapper">
        <div className="monthly-goal-panel collapsed">
          <button className="collapse-toggle" onClick={onToggleCollapse}>
            <h3>이달의 목표</h3>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-goal-wrapper">
      <div className="monthly-goal-panel">
        <div className="monthly-goal-header">
          <h3>이달의 목표</h3>
          {onToggleCollapse && (
            <button className="collapse-toggle-inline" onClick={onToggleCollapse}>
              <ChevronUp size={16} />
            </button>
          )}
        </div>
        <div className="monthly-goal-content">
          <div className="monthly-goal-list">
            {goals.map((goal, index) => (
              <div key={goal.id} className="monthly-goal-item">
                <input
                  type="checkbox"
                  checked={goal.completed}
                  onChange={() => handleGoalToggle(index)}
                  className="todo-checkbox acorn-checkbox"
                  style={{ '--acorn-color': 'var(--accent-color)' } as React.CSSProperties}
                />
                <input
                  type="text"
                  value={goal.text}
                  onChange={(e) => {
                    const text = e.target.value.slice(0, 50);
                    handleGoalChange(index, text);
                  }}
                  onBlur={() => saveGoals(goals)}
                  className="monthly-goal-input"
                  placeholder=""
                  maxLength={50}
                  disabled={goal.completed}
                  style={goal.completed ? { opacity: 0.6, color: 'var(--text-secondary)' } : {}}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

