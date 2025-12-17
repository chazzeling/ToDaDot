import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import * as settingsService from '../firebase/settingsService';
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
  const { user, isAuthenticated } = useFirebaseAuth();
  const [goals, setGoals] = useState<MonthlyGoalItem[]>(() => 
    Array.from({ length: 5 }, (_, i) => ({
      id: `goal-${i}`,
      text: '',
      completed: false,
    }))
  );
  const isInitialLoadRef = useRef(true);
  const hasSyncedRef = useRef<string | false>(false);

  // 현재 월의 키 생성 (YYYY-MM 형식)
  const getCurrentMonthKey = (date: string): string => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthKey = getCurrentMonthKey(selectedDate);

  // 로드 저장된 목표 (localStorage + Firebase)
  useEffect(() => {
    const loadGoals = async () => {
      isInitialLoadRef.current = true;
      let monthGoals: MonthlyGoalItem[] | null = null;

      // 1. localStorage에서 로드
      const saved = localStorage.getItem('monthly-goals');
      if (saved) {
        try {
          const allGoals: Record<string, MonthlyGoalItem[]> = JSON.parse(saved);
          monthGoals = allGoals[monthKey] || null;
        } catch (e) {
          console.error('Failed to load monthly goals from localStorage:', e);
        }
      }

      // 2. Firebase에서 로드 (인증된 경우)
      if (isAuthenticated && user) {
        // 사용자 변경 시 hasSyncedRef 리셋
        const currentUserId = user.uid;
        if (hasSyncedRef.current && typeof hasSyncedRef.current === 'string' && hasSyncedRef.current !== currentUserId) {
          hasSyncedRef.current = false;
        }

        if (!hasSyncedRef.current) {
          try {
            console.log('📥 Loading monthly goals from Firebase for:', monthKey);
            const firebaseGoals = await settingsService.getMonthlyGoals(monthKey);
            if (firebaseGoals && Array.isArray(firebaseGoals)) {
              console.log('📥 Loaded monthly goals from Firebase:', firebaseGoals.length);
              // Firebase 데이터가 있으면 우선 사용
              monthGoals = firebaseGoals;
            } else if (monthGoals && monthGoals.length > 0) {
              // Firebase에 없고 로컬에만 있으면 Firebase에 저장
              console.log('💾 Saving local monthly goals to Firebase...');
              await settingsService.saveMonthlyGoals(monthKey, monthGoals);
            }
            hasSyncedRef.current = currentUserId;
          } catch (error) {
            console.error('Failed to load monthly goals from Firebase:', error);
          }
        }
      } else {
        hasSyncedRef.current = false;
      }

      // 3. 데이터 적용
      if (monthGoals && Array.isArray(monthGoals)) {
        // 저장된 목표와 기본 5개 목표 병합
        const mergedGoals = Array.from({ length: 5 }, (_, i) => 
          monthGoals[i] || { id: `goal-${i}`, text: '', completed: false }
        );
        setGoals(mergedGoals);
      }
      
      isInitialLoadRef.current = false;
    };

    loadGoals();
  }, [monthKey, isAuthenticated, user]);

  // 목표 저장 (localStorage + Firebase)
  const saveGoals = async (updatedGoals: MonthlyGoalItem[]) => {
    // localStorage에 저장
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

    // Firebase에 저장 (인증된 경우, 초기 로드 중이 아닐 때)
    if (isAuthenticated && user && !isInitialLoadRef.current) {
      try {
        await settingsService.saveMonthlyGoals(monthKey, updatedGoals);
        console.log('✅ Monthly goals saved to Firebase:', monthKey);
      } catch (error) {
        console.error('Failed to save monthly goals to Firebase:', error);
      }
    }
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

