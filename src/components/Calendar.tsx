import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DateString, Event, Sticker, EventCategory, TodoItem } from '../types';
import { Check } from 'lucide-react';
// CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리
import './Calendar.css';
import './EventTab.css';

interface CalendarProps {
  selectedDate: DateString;
  onDateSelect: (date: DateString) => void;
  events: Event[];
  isExpanded: boolean;
  onEventClick?: (event: Event) => void;
  onEventUpdate?: (event: Event) => void;
  onEventDelete?: (id: string) => void;
  showMoodTracker?: boolean;
  moodColors?: string[];
  onMoodSelect?: (date: DateString, color: string) => void;
  moodEntries?: { date: string; color: string }[];
  onMoodTrackerModeChange?: (isActive: boolean) => void;
  // 스티커 관련 props
  isStickerEditMode?: boolean;
  stickers?: Sticker[];
  onStickersChange?: (stickers: Sticker[]) => void;
  // 일정 관리 관련 props
  onAddEvent?: (date: DateString, title: string, color: string, categoryId?: string, time?: string, endDate?: DateString) => void;
  onUpdateEvent?: (id: string, title: string, color: string, date?: DateString, categoryId?: string, time?: string, endDate?: DateString) => void;
  categories?: EventCategory[];
  onCreateCategory?: (name: string, color: string) => void;
  onUpdateCategory?: (id: string, name: string, color: string) => void;
  onDeleteCategory?: (id: string) => void;
  // 메모 관련 props
  datesWithMemos?: DateString[];
  datesWithDiaries?: DateString[];
  // 할 일 관련 props (미완료 알림 링용)
  todos?: TodoItem[];
  // 루틴 관련 props (루틴 탭 달력용)
  routines?: Array<{ id: string; text: string }>;
  activeRoutineIdsByDate?: (date: DateString) => string[]; // 각 날짜별 활성화된 루틴 ID 목록을 반환하는 함수
  // 요일 선택 관련 props
  onDayOfWeekSelect?: (dayIndex: number | null) => void;
  selectedDayOfWeek?: number | null;
  activeTab?: string;
}

// CalendarDay 컴포넌트를 메모이제이션
const CalendarDay = React.memo(({
  date,
  day,
  dayEvents,
  moodEntry,
  isSelected,
  isToday,
  isInCurrentMonth,
  isMoodMode,
  isExpanded,
  onDateClick,
  onEventClick,
  hasMemo = false,
  hasDiary = false,
  hasIncompleteTodos = false,
  hasAllCompletedTodos = false,
  onEventDrop,
}: {
  date: DateString;
  day: number;
  dayEvents: Event[];
  moodEntry?: { date: string; color: string };
  isSelected: boolean;
  isToday: boolean;
  isInCurrentMonth: boolean;
  isMoodMode: boolean;
  isExpanded: boolean;
  onDateClick: (date: DateString, e: React.MouseEvent) => void;
  onEventClick: (event: Event, e: React.MouseEvent) => void;
  hasMemo?: boolean;
  hasDiary?: boolean;
  hasIncompleteTodos?: boolean;
  hasAllCompletedTodos?: boolean;
  onEventDrop?: (eventId: string, targetDate: DateString) => void;
}) => {
  const handleEventClick = useCallback((e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    onEventClick(event, e);
  }, [onEventClick]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('application/x-event-id')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const eventId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/x-event-id');
    if (eventId && onEventDrop) {
      onEventDrop(eventId, date);
    }
    return false;
  }, [date, onEventDrop]);

  const maxVisibleEvents = isExpanded ? 5 : 2;

  return (
    <div
      key={date}
      className={`calendar-day ${!isInCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isMoodMode ? 'mood-mode' : ''}`}
      onClick={(e) => onDateClick(date, e)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={moodEntry && !isExpanded && isMoodMode ? { backgroundColor: moodEntry.color } : undefined}
    >
      <span 
        className="day-number"
        style={{ position: 'relative' }}
      >
        {day}
        {hasIncompleteTodos && !isExpanded && (
          <span className="incomplete-plus">+</span>
        )}
        {hasAllCompletedTodos && !hasIncompleteTodos && !isExpanded && (
          <Check size={10} className="completed-check" style={{ color: 'var(--accent-color)' }} />
        )}
      </span>
      {!isMoodMode && (
        <div className="day-content">
          {dayEvents.length > 0 && (
            <div className="event-list scrollable-event-list">
              {(() => {
                // 연속 일정과 개별 일정을 분리
                const multiDayEvents: Event[] = [];
                const singleDayEvents: Event[] = [];
                
                dayEvents.forEach((event) => {
                  const isMultiDay = event.endDate && event.endDate !== event.date;
                  if (isMultiDay) {
                    multiDayEvents.push(event);
                  } else {
                    singleDayEvents.push(event);
                  }
                });
                
                // 연속 일정을 먼저, 개별 일정을 나중에 배치
                const sortedEvents = [...multiDayEvents, ...singleDayEvents];
                
                return sortedEvents.map((event) => {
                  // 기간 일정인지 확인
                  const isMultiDay = event.endDate && event.endDate !== event.date;
                  const eventStartDate = event.date;
                  const eventEndDate = event.endDate || event.date;
                
                // 현재 날짜가 시작일/종료일/중간일인지 확인
                let positionClass = '';
                if (isMultiDay) {
                  if (date === eventStartDate) {
                    positionClass = 'range-start';
                  } else if (date === eventEndDate) {
                    positionClass = 'range-end';
                  } else {
                    positionClass = 'range-middle';
                  }
                }
                
                // 배경색 설정: 기간 일정은 카테고리 색상 연하게, 개별 일정은 흰색
                const getBackgroundColor = (): string => {
                  if (!isMultiDay) {
                    return 'rgba(255, 255, 255, 0.5)';
                  }
                  // 카테고리 색상을 연하게 변환
                  const hex = event.color.replace('#', '');
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  return `rgba(${r}, ${g}, ${b}, 0.2)`;
                };
                
                // 제목 표시 여부: 기간 일정은 시작일에만, 개별 일정은 항상
                const showTitle = isExpanded && (!isMultiDay || positionClass === 'range-start');

                return (
                  <div
                    key={event.id}
                    className={`event-item ${isExpanded ? 'expanded' : ''} ${positionClass}`}
                    style={{ 
                      // 개별 일정 또는 기간 일정의 시작일: 좌측 border 표시
                      borderLeftColor: (!isMultiDay || positionClass === 'range-start') ? event.color : undefined,
                      borderLeftWidth: (!isMultiDay || positionClass === 'range-start') ? '5px' : '0',
                      // 기간 일정의 종료일: 우측 border 표시
                      borderRightColor: positionClass === 'range-end' ? event.color : undefined,
                      borderRightWidth: positionClass === 'range-end' ? '5px' : '0',
                      backgroundColor: getBackgroundColor(),
                    } as React.CSSProperties}
                    onClick={(e) => handleEventClick(e, event)}
                    title={event.title}
                    draggable={true}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', event.id);
                      e.dataTransfer.setData('application/x-event-id', event.id);
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = '0.5';
                      }
                    }}
                    onDragEnd={(e) => {
                      if (e.currentTarget instanceof HTMLElement) {
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    {showTitle && (
                      <>
                        <span className="event-title">{event.title}</span>
                      </>
                    )}
                  </div>
                );
                });
              })()}
            </div>
          )}
        </div>
      )}
      {moodEntry && !isExpanded && !isMoodMode && (
        <div 
          className="mood-indicator"
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: moodEntry.color,
            marginTop: 'auto',
          }}
        />
      )}
    </div>
  );
});

CalendarDay.displayName = 'CalendarDay';

export default function Calendar({ 
  selectedDate, 
  onDateSelect, 
  events, 
  isExpanded, 
  onEventClick, 
  onEventUpdate, 
  onEventDelete,
  showMoodTracker = false,
  moodColors = [],
  onMoodSelect,
  moodEntries = [],
  onMoodTrackerModeChange,
  isStickerEditMode = false,
  stickers = [],
  onStickersChange,
  onAddEvent,
  onUpdateEvent,
  categories = [],
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  datesWithMemos = [],
  datesWithDiaries = [],
  onDayOfWeekSelect,
  selectedDayOfWeek,
  activeTab,
  todos = [],
  routines = [],
  activeRoutineIdsByDate,
}: CalendarProps) {
  // isExpanded가 false로 변경될 때 스티커 목록 초기화
  // 🚨 스티커 props 제거: StickerOverlayComponent가 전역으로 처리
  // useEffect 제거 (더 이상 필요 없음)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // 월요일부터 시작하도록 변환 (0=일요일 -> 6, 1=월요일 -> 0, ...)
    return day === 0 ? 6 : day - 1;
  };


  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date: DateString, e: React.MouseEvent) => {
    e.stopPropagation();
    onDateSelect(date);
  };

  const handleEventClick = (event: Event, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const handleEventDrop = useCallback((eventId: string, targetDate: DateString) => {
    const event = events.find(e => e.id === eventId);
      if (event && onUpdateEvent) {
        onUpdateEvent(eventId, event.title, event.color, targetDate, event.categoryId, event.time, event.endDate);
      }
  }, [events, onUpdateEvent]);

  const formatDateString = useCallback((year: number, month: number, day: number): DateString => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  // 캘린더 날짜 계산 (메모이제이션)
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days: { date: DateString; day: number; isInCurrentMonth: boolean }[] = [];
    
    // 이전 달의 마지막 날들
    // 현재 달의 첫 번째 날로 이동한 후 하루 빼서 이전 달의 마지막 날 계산
    const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    const prevMonthYear = prevMonthLastDay.getFullYear();
    const prevMonthMonth = prevMonthLastDay.getMonth();
    const prevMonthDays = prevMonthLastDay.getDate(); // 이전 달의 실제 마지막 날짜 (28, 29, 30, 31 중 하나)
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i; // 이전 달의 마지막 날짜부터 역순
      const dateString = formatDateString(prevMonthYear, prevMonthMonth, day);
      days.push({ date: dateString, day, isInCurrentMonth: false });
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateString(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      days.push({ date: dateString, day, isInCurrentMonth: true });
    }
    
    // 다음 달의 첫 날들 (35칸 채우기 - 5줄)
    const remaining = 35 - days.length;
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    for (let day = 1; day <= remaining; day++) {
      const dateString = formatDateString(nextMonth.getFullYear(), nextMonth.getMonth(), day);
      days.push({ date: dateString, day, isInCurrentMonth: false });
    }
    
    return days;
  }, [currentMonth, formatDateString]);

  // 이벤트 필터링 메모이제이션 (기간 일정 포함)
  const getEventsForDate = useCallback((date: DateString): Event[] => {
    return events.filter((event) => {
      // 해당 날짜가 일정의 시작일과 종료일 사이에 있으면 표시
      const startDate = event.date;
      const endDate = event.endDate || event.date;
      
      // 날짜 문자열을 Date 객체로 변환하여 비교
      const eventStart = new Date(startDate);
      const eventEnd = new Date(endDate);
      const checkDate = new Date(date);
      
      // 날짜 부분만 비교 (시간 제외)
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(0, 0, 0, 0);
      checkDate.setHours(0, 0, 0, 0);
      
      return checkDate >= eventStart && checkDate <= eventEnd;
    });
  }, [events]);

  const hasMoodEntry = useCallback((date: DateString): { date: string; color: string } | undefined => {
    return moodEntries.find((m) => m.date === date);
  }, [moodEntries]);

  // 🚦 미완료 할 일이 있는 날짜 확인 (1개 이상)
  // 메모/다이어리 탭: 일기 데이터와 분리 (일기 표시는 hasDiary 사용)
  // 루틴 탭: 현재 활성화된 루틴 목록 기준으로 확인
  // 다른 탭: routine-으로 시작하지 않는 할 일만
  const hasIncompleteTodos = useCallback((date: DateString): boolean => {
    // 메모/다이어리 탭은 할 일 표시를 사용하지 않음
    if (activeTab === 'memo' || activeTab === 'diary') {
      return false;
    }
    
    if (activeTab === 'routine' && activeRoutineIdsByDate) {
      // 루틴 탭: 활성화된 루틴 ID 목록을 가져와서 해당 날짜에 미완료 할 일이 있는지 확인
      const activeIds = activeRoutineIdsByDate(date);
      if (activeIds.length === 0) return false;
      
      // 활성화된 루틴 중 하나라도 미완료 상태면 true
      return activeIds.some(routineId => {
        const todo = todos.find(t => t.id === `routine-${routineId}-${date}`);
        return todo && !todo.completed;
      });
    } else {
      // 매트릭스/카테고리 탭: 해당 날짜에 미완료 할 일이 있는지 확인 (루틴 제외)
      const dateTodos = todos.filter(todo => todo.date === date && !todo.id.startsWith('routine-'));
      return dateTodos.length > 0 && dateTodos.some(todo => !todo.completed);
    }
  }, [todos, activeTab, activeRoutineIdsByDate]);

  // ✅ 모든 할 일이 완료된 날짜 확인 (할 일이 1개 이상 있고 모두 완료된 경우)
  // 루틴 탭: 현재 활성화된 루틴 목록 기준으로 확인
  // 매트릭스/카테고리 탭: routine-으로 시작하지 않는 할 일만 확인
  // 일기 탭: rich-text-editor에 내용이 있으면 체크 표시 (datesWithDiaries 사용)
  // 메모 탭: 메모가 있는 날짜에만 체크 표시 (datesWithMemos 사용)
  const hasAllCompletedTodos = useCallback((date: DateString): boolean => {
    // 일기 탭: rich-text-editor에 내용이 있으면 체크 표시
    if (activeTab === 'diary') {
      return datesWithDiaries.includes(date);
    }
    
    // 메모 탭: 메모가 있는 날짜에만 체크 표시
    if (activeTab === 'memo') {
      return datesWithMemos.includes(date);
    }
    
    if (activeTab === 'routine' && activeRoutineIdsByDate) {
      // 루틴 탭: 활성화된 루틴 ID 목록을 가져와서 모두 완료되었는지 확인
      const activeIds = activeRoutineIdsByDate(date);
      if (activeIds.length === 0) return false;
      
      // 활성화된 루틴이 모두 완료 상태여야 true
      return activeIds.every(routineId => {
        const todo = todos.find(t => t.id === `routine-${routineId}-${date}`);
        return todo && todo.completed;
      });
    } else {
      // 매트릭스/카테고리 탭: 해당 날짜에 할 일이 1개 이상 있고 모두 완료되었는지 확인 (루틴 제외)
      const dateTodos = todos.filter(todo => todo.date === date && !todo.id.startsWith('routine-'));
      // 할 일이 1개 이상 있고, 모두 완료되었으며, 미완료 할 일이 없어야 함
      return dateTodos.length > 0 && dateTodos.every(todo => todo.completed);
    }
  }, [todos, activeTab, activeRoutineIdsByDate, datesWithDiaries, datesWithMemos]);

  const monthYear = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  // 탭별 타이틀 결정
  const calendarTitle = activeTab === 'routine' 
    ? 'Daily Check' 
    : activeTab === 'memo' || activeTab === 'diary'
    ? 'Record' 
    : activeTab === 'quadrant' || activeTab === 'category'
    ? 'To Do'
    : null;

  return (
    <div className={`calendar-wrapper ${isExpanded ? 'expanded' : ''}`}>
      {calendarTitle && !isExpanded && (
        <div className="calendar-title">{calendarTitle}</div>
      )}
      <div className={`calendar ${isExpanded ? 'expanded' : ''}`} style={{ position: 'relative' }}>
        <div className="calendar-header">
          <button className="calendar-nav-btn" onClick={handlePrevMonth}>
            ‹
          </button>
          <h3 className="calendar-month">{monthYear}</h3>
          <button className="calendar-nav-btn" onClick={handleNextMonth}>
            ›
          </button>
        </div>
      <div className="calendar-weekdays">
        {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => {
          // Calendar의 요일 인덱스: 월요일=1, 화요일=2, ..., 일요일=0
          // JavaScript Date.getDay(): 일요일=0, 월요일=1, ..., 토요일=6
          // Calendar는 월요일부터 시작하므로 1,2,3,4,5,6,0 순서
          const dayIndex = index === 6 ? 0 : index + 1;
          const isSelected = activeTab === 'memo' && selectedDayOfWeek === dayIndex;
          return (
            <div
              key={day}
              className={`weekday ${isSelected ? 'selected' : ''}`}
              onClick={(e) => {
                if (activeTab === 'memo' && onDayOfWeekSelect) {
                  e.stopPropagation();
                  if (selectedDayOfWeek === dayIndex) {
                    onDayOfWeekSelect(null);
                  } else {
                    onDayOfWeekSelect(dayIndex);
                  }
                }
              }}
              style={{
                cursor: activeTab === 'memo' ? 'pointer' : 'default',
                background: isSelected ? 'var(--accent-color)' : 'transparent',
                color: isSelected ? 'white' : 'var(--text-secondary)',
                borderRadius: '4px',
                transition: 'all 0.2s',
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
      <div className="calendar-days" style={{ position: 'relative' }}>
        {calendarDays.map(({ date, day, isInCurrentMonth }) => {
          const isSelected = date === selectedDate;
          const isToday = date === todayString;
          const dayEvents = getEventsForDate(date);
          // 무드 트래킹은 다이어리/메모 탭에서만 표시
          const moodEntry = (activeTab === 'diary' || activeTab === 'memo') ? hasMoodEntry(date) : undefined;
          const isMoodMode = false;

          if (!isInCurrentMonth && !isExpanded) {
            return <div key={date} className="calendar-day empty"></div>;
          }

          return (
            <CalendarDay
              key={date}
              date={date}
              day={day}
              dayEvents={dayEvents}
              moodEntry={moodEntry}
              isSelected={isSelected}
              isToday={isToday}
              isInCurrentMonth={isInCurrentMonth}
              isMoodMode={isMoodMode}
              isExpanded={isExpanded}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
              hasMemo={false}
              hasDiary={false}
              hasIncompleteTodos={hasIncompleteTodos(date)}
              hasAllCompletedTodos={hasAllCompletedTodos(date)}
              onEventDrop={handleEventDrop}
            />
          );
        })}
        {/* 🚨 CalendarSticker 제거: StickerOverlayComponent가 전역으로 처리 */}
      </div>
      </div>
    </div>
  );
}