import { useState, useEffect } from 'react';
import { Event, DateString, EventCategory } from '../types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ScheduleColorPresets from './ScheduleColorPresets';
import TimePicker from './TimePicker';
import './EventTab.css';

interface EventTabProps {
  events: Event[];
  selectedDate: DateString;
  onAddEvent?: (date: DateString, title: string, color: string, categoryId?: string, time?: string, endDate?: DateString) => void;
  onUpdateEvent: (id: string, title: string, color: string, date?: DateString, categoryId?: string, time?: string, endDate?: DateString) => void;
  onDeleteEvent: (id: string) => void;
  selectedEvent?: Event | null;
  onEventSelect?: (event: Event | null) => void;
  categories: EventCategory[];
  onCreateCategory?: (name: string, color: string) => void;
  onUpdateCategory?: (id: string, name: string, color: string) => void;
  onDeleteCategory?: (id: string) => void;
}

export default function EventTab({ 
  events, 
  selectedDate, 
  onAddEvent,
  onUpdateEvent, 
  onDeleteEvent,
  selectedEvent,
  onEventSelect,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: EventTabProps) {
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [eventOrder, setEventOrder] = useState<string[]>([]);
  const [showEventManager, setShowEventManager] = useState(false);
  
  // 일정 관리 모달용 상태
  const [newEventTitle, setNewEventTitle] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedDateForEvent, setSelectedDateForEvent] = useState(selectedDate);
  const [newEventEndDate, setNewEventEndDate] = useState<string>('');
  const [newEventTime, setNewEventTime] = useState<string>('');
  const [showManageCategory, setShowManageCategory] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState<EventCategory | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#FFF2B2');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryColor, setEditCategoryColor] = useState('#FFF2B2');
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setSelectedDateForEvent(selectedDate);
    setNewEventEndDate(selectedDate); // 종료일도 기본값으로 설정
  }, [selectedDate]);

  useEffect(() => {
    if (selectedEvent) {
      setEditEvent(selectedEvent);
      if (onEventSelect) {
        onEventSelect(null);
      }
    }
  }, [selectedEvent, onEventSelect]);

  // 기간 일정을 포함하여 해당 날짜의 일정 필터링
  const selectedDateEvents = events.filter((event) => {
    const startDate = event.date;
    const endDate = event.endDate || event.date;
    
    // 날짜 문자열을 Date 객체로 변환하여 비교
    const eventStart = new Date(startDate);
    const eventEnd = new Date(endDate);
    const checkDate = new Date(selectedDate);
    
    // 날짜 부분만 비교 (시간 제외)
    eventStart.setHours(0, 0, 0, 0);
    eventEnd.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= eventStart && checkDate <= eventEnd;
  });
  
  // 이벤트 순서 초기화 또는 업데이트
  useEffect(() => {
    const eventIds = selectedDateEvents.map(e => e.id);
    const eventIdsString = eventIds.join(',');
    const currentOrderString = eventOrder.join(',');
    
    // 날짜가 변경되었거나 새로운 이벤트가 추가된 경우에만 순서 업데이트
    if (eventIds.length > 0) {
      const hasNewEvents = eventIds.some(id => !eventOrder.includes(id));
      const hasRemovedEvents = eventOrder.some(id => !eventIds.includes(id));
      
      if (hasNewEvents || hasRemovedEvents || eventOrder.length === 0) {
        // 순서를 유지하면서 새 이벤트를 끝에 추가
        const existingOrder = eventOrder.filter(id => eventIds.includes(id));
        const newEvents = eventIds.filter(id => !eventOrder.includes(id));
        setEventOrder([...existingOrder, ...newEvents]);
      }
    } else {
      setEventOrder([]);
    }
  }, [selectedDate, selectedDateEvents.length, selectedDateEvents.map(e => e.id).join(',')]);

  // 순서에 따라 이벤트 정렬
  const sortedEvents = eventOrder.length > 0 
    ? [...selectedDateEvents].sort((a, b) => {
        const indexA = eventOrder.indexOf(a.id);
        const indexB = eventOrder.indexOf(b.id);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
    : selectedDateEvents;


  const [draggingToDate, setDraggingToDate] = useState<DateString | null>(null);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    setDraggedEventId(eventId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', eventId);
    e.dataTransfer.setData('application/x-event-id', eventId);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedEventId(null);
    setDraggingToDate(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetEventId: string) => {
    e.preventDefault();
    if (!draggedEventId || draggedEventId === targetEventId) return;

    const currentOrder = eventOrder.length > 0 ? [...eventOrder] : sortedEvents.map(e => e.id);
    const draggedIndex = currentOrder.indexOf(draggedEventId);
    const targetIndex = currentOrder.indexOf(targetEventId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedEventId);
    
    setEventOrder(newOrder);
    setDraggedEventId(null);
  };


  const handleUpdateEvent = () => {
    if (editEvent && editEvent.title.trim()) {
      // 현재 선택된 카테고리 ID 찾기
      const selectedCategory = categories.find(c => c.color === editEvent.color);
      const categoryId = selectedCategory?.id || editEvent.categoryId;
      
      // time이 undefined이거나 빈 문자열이면 undefined로 전달
      const timeValue = editEvent.time && editEvent.time.trim() ? editEvent.time : undefined;
      console.log('💾 handleUpdateEvent:', {
        id: editEvent.id,
        title: editEvent.title.trim(),
        time: timeValue,
        timeType: typeof timeValue,
        isUndefined: timeValue === undefined,
      });
      const endDateValue = editEvent.endDate && editEvent.endDate !== editEvent.date ? editEvent.endDate : undefined;
      onUpdateEvent(editEvent.id, editEvent.title.trim(), editEvent.color, editEvent.date, categoryId, timeValue, endDateValue);
      setEditEvent(null);
    }
  };

  const handleDeleteEvent = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeleteEvent(deleteConfirm);
      setDeleteConfirm(null);
      // 삭제된 이벤트를 순서에서 제거
      setEventOrder(prev => prev.filter(id => id !== deleteConfirm));
    }
  };

  // 일정 관리 모달용 핸들러
  const handleAddEvent = () => {
    if (newEventTitle.trim() && selectedCategoryId && onAddEvent) {
      const category = categories.find(c => c.id === selectedCategoryId);
      if (category) {
        const endDate = newEventEndDate && newEventEndDate !== selectedDateForEvent ? newEventEndDate : undefined;
        onAddEvent(selectedDateForEvent, newEventTitle.trim(), category.color, category.id, newEventTime || undefined, endDate);
        setNewEventTitle('');
        setSelectedCategoryId('');
        setNewEventEndDate(selectedDate); // 종료일도 초기화
        setNewEventTime('');
      }
    }
  };

  const handleCreateCategory = () => {
    if (newCategoryName.trim() && newCategoryColor && onCreateCategory) {
      onCreateCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#FFF2B2');
      setShowCreateCategory(false);
    }
  };

  const handleEditCategory = (category: EventCategory) => {
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setShowEditCategory(category);
    setShowManageCategory(false);
  };

  const handleUpdateCategory = () => {
    if (showEditCategory && editCategoryName.trim() && onUpdateCategory) {
      onUpdateCategory(showEditCategory.id, editCategoryName.trim(), editCategoryColor);
      setShowEditCategory(null);
      setEditCategoryName('');
      setEditCategoryColor('#FFF2B2');
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setDeleteCategoryConfirm(categoryId);
    setShowManageCategory(false);
  };

  const confirmDeleteCategory = () => {
    if (deleteCategoryConfirm && onDeleteCategory) {
      onDeleteCategory(deleteCategoryConfirm);
      setDeleteCategoryConfirm(null);
    }
  };

  return (
    <div className={`event-tab ${isCollapsed ? 'collapsed' : ''}`}>
      {isCollapsed ? (
        <button className="collapse-toggle" onClick={() => setIsCollapsed(false)}>
          <h3>일정 관리</h3>
          <ChevronDown size={16} />
        </button>
      ) : (
        <>
          {/* 일정 관리 버튼 */}
          <div className="event-tab-content">
            {onAddEvent && (
              <div 
                style={{ 
                  paddingTop: '15px',
                  paddingBottom: '10px',
                  paddingLeft: '15px',
                  paddingRight: '15px',
                  position: 'relative', 
                  zIndex: 100,
                  pointerEvents: 'auto',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="event-manager-header">
                  <h3>일정 관리</h3>
                  <button className="collapse-toggle-inline" onClick={() => setIsCollapsed(true)}>
                    <ChevronUp size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('일정 관리 버튼 클릭됨, showEventManager:', showEventManager);
                    setShowEventManager(true);
                    console.log('상태 업데이트 완료');
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onMouseUp={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    background: 'var(--sub-color)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    width: '100%',
                    position: 'relative',
                    zIndex: 100,
                    pointerEvents: 'auto',
                    touchAction: 'manipulation',
                    marginTop: '10px',
                  }}
                  title="일정 관리"
                >
                  일정 추가
                </button>
              </div>
            )}

            {/* 선택한 날짜의 일정 목록 */}
            <div className="events-list">
              <h3>선택한 날짜의 일정 ({selectedDate})</h3>
              {selectedDateEvents.length === 0 ? (
                <p className="no-events">일정이 없습니다.</p>
              ) : (
                <div className="events">
                  {sortedEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="event-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, event.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, event.id)}
                      onClick={() => setEditEvent(event)}
                      style={{ 
                        borderLeftColor: event.color,
                        opacity: draggedEventId === event.id ? 0.5 : 1,
                        cursor: 'grab'
                      }}
                    >
                      <div className="event-content">
                        <span className="event-title">{event.title}</span>
                        {event.time && (
                          <span className="event-time">{event.time}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 일정 수정 모달 */}
          {editEvent && (
            <div className="modal-overlay" onClick={() => setEditEvent(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>일정 수정</h3>
            <div className="modal-form">
              <label>
                일정 제목
                <input
                  type="text"
                  value={editEvent.title}
                  onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                  className="modal-input"
                  autoFocus
                />
              </label>
              <div className="form-group">
                <label>시작일</label>
                <input
                  type="date"
                  value={editEvent.date}
                  onChange={(e) => {
                    const newDate = e.target.value as DateString;
                    setEditEvent({ 
                      ...editEvent, 
                      date: newDate,
                      // 종료일이 시작일보다 이전이면 종료일도 업데이트
                      endDate: editEvent.endDate && editEvent.endDate < newDate ? newDate : editEvent.endDate
                    });
                  }}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>종료일 (선택사항)</label>
                <input
                  type="date"
                  value={editEvent.endDate || ''}
                  onChange={(e) => setEditEvent({ ...editEvent, endDate: e.target.value as DateString || undefined })}
                  min={editEvent.date}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>분류</label>
                <select
                  value={editEvent.categoryId || categories.find(c => c.color === editEvent.color)?.id || ''}
                  onChange={(e) => {
                    const category = categories.find(c => c.id === e.target.value);
                    if (category) {
                      setEditEvent({ 
                        ...editEvent, 
                        color: category.color,
                        categoryId: category.id 
                      });
                    }
                  }}
                  className="form-input"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <TimePicker
                  value={editEvent.time}
                  onChange={(time) => {
                    console.log('🕐 TimePicker onChange:', time);
                    setEditEvent({ ...editEvent, time: time || undefined });
                  }}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setEditEvent(null)}>
                취소
              </button>
              <button className="modal-confirm" onClick={handleUpdateEvent}>
                수정
              </button>
              <button 
                className="modal-delete" 
                onClick={() => {
                  handleDeleteEvent(editEvent.id);
                  setEditEvent(null);
                }}
              >
                삭제
              </button>
            </div>
          </div>
            </div>
          )}
        </>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>일정 삭제</h3>
            <p>정말 삭제할까요?</p>
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

      {/* 일정 관리 모달 */}
      {showEventManager && onAddEvent && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowEventManager(false);
            setEditEvent(null);
            setShowManageCategory(false);
            setShowCreateCategory(false);
            setShowEditCategory(null);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>일정 관리</h3>
              <button 
                onClick={() => setShowManageCategory(true)}
                style={{ 
                  background: 'var(--sub-color)', 
                  color: 'var(--text-primary)', 
                  border: 'none', 
                  borderRadius: '6px', 
                  padding: '6px 12px', 
                  cursor: 'pointer', 
                  fontSize: '12px', 
                  fontWeight: 500 
                }}
              >
                분류 관리
              </button>
            </div>

            {/* 일정 추가 폼 */}
            <div className="event-form" style={{ marginBottom: '30px' }}>
              <div className="form-group">
                <label>시작일</label>
                <input
                  type="date"
                  value={selectedDateForEvent}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    setSelectedDateForEvent(newStartDate);
                    // 종료일이 시작일보다 이전이면 종료일도 업데이트
                    if (!newEventEndDate || newEventEndDate < newStartDate) {
                      setNewEventEndDate(newStartDate);
                    }
                  }}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>종료일</label>
                <input
                  type="date"
                  value={newEventEndDate || selectedDateForEvent}
                  onChange={(e) => setNewEventEndDate(e.target.value)}
                  min={selectedDateForEvent}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>일정 제목</label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddEvent();
                    }
                  }}
                  placeholder="일정 제목 입력"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>분류</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="form-input"
                >
                  <option value="">분류 선택</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <TimePicker
                  value={newEventTime}
                  onChange={(time) => setNewEventTime(time || '')}
                />
              </div>

              <button 
                className="add-event-btn" 
                onClick={handleAddEvent}
                disabled={!newEventTitle.trim() || !selectedCategoryId}
                style={{ opacity: (!newEventTitle.trim() || !selectedCategoryId) ? 0.5 : 1 }}
              >
                일정 추가
              </button>
            </div>

            {/* 일정 목록 */}
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 600 }}>선택한 날짜의 일정 ({selectedDateForEvent})</h4>
              {events.filter(e => {
                const startDate = e.date;
                const endDate = e.endDate || e.date;
                const eventStart = new Date(startDate);
                const eventEnd = new Date(endDate);
                const checkDate = new Date(selectedDateForEvent);
                eventStart.setHours(0, 0, 0, 0);
                eventEnd.setHours(0, 0, 0, 0);
                checkDate.setHours(0, 0, 0, 0);
                return checkDate >= eventStart && checkDate <= eventEnd;
              }).length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', margin: 0 }}>일정이 없습니다.</p>
              ) : (
                <div className="events">
                  {events.filter(e => {
                    const startDate = e.date;
                    const endDate = e.endDate || e.date;
                    const eventStart = new Date(startDate);
                    const eventEnd = new Date(endDate);
                    const checkDate = new Date(selectedDateForEvent);
                    eventStart.setHours(0, 0, 0, 0);
                    eventEnd.setHours(0, 0, 0, 0);
                    checkDate.setHours(0, 0, 0, 0);
                    return checkDate >= eventStart && checkDate <= eventEnd;
                  }).map((event) => (
                    <div 
                      key={event.id} 
                      className="event-item"
                      onClick={() => setEditEvent(event)}
                      style={{ 
                        borderLeftColor: event.color,
                        cursor: 'pointer'
                      }}
                    >
                      <div className="event-content">
                        <span className="event-title">{event.title}</span>
                        {event.time && (
                          <span className="event-time">{event.time}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 일정 수정 모달 (일정 관리 모달 안에서) */}
            {editEvent && (
              <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setEditEvent(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>일정 수정</h3>
                  <div className="modal-form">
                    <label>
                      일정 제목
                      <input
                        type="text"
                        value={editEvent.title}
                        onChange={(e) => setEditEvent({ ...editEvent, title: e.target.value })}
                        className="modal-input"
                        autoFocus
                      />
                    </label>
                    <div className="form-group">
                      <label>시작일</label>
                      <input
                        type="date"
                        value={editEvent.date}
                        onChange={(e) => {
                          const newDate = e.target.value as DateString;
                          setEditEvent({ 
                            ...editEvent, 
                            date: newDate,
                            // 종료일이 시작일보다 이전이면 종료일도 업데이트
                            endDate: editEvent.endDate && editEvent.endDate < newDate ? newDate : editEvent.endDate
                          });
                        }}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>종료일 (선택사항)</label>
                      <input
                        type="date"
                        value={editEvent.endDate || ''}
                        onChange={(e) => setEditEvent({ ...editEvent, endDate: e.target.value as DateString || undefined })}
                        min={editEvent.date}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>분류</label>
                      <select
                        value={editEvent.categoryId || categories.find(c => c.color === editEvent.color)?.id || ''}
                        onChange={(e) => {
                          const category = categories.find(c => c.id === e.target.value);
                          if (category) {
                            setEditEvent({ 
                              ...editEvent, 
                              color: category.color,
                              categoryId: category.id 
                            });
                          }
                        }}
                        className="form-input"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <TimePicker
                        value={editEvent.time}
                        onChange={(time) => setEditEvent({ ...editEvent, time })}
                      />
                    </div>
            </div>
            <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => setEditEvent(null)}>
                      취소
                    </button>
                    <button className="modal-confirm" onClick={handleUpdateEvent}>
                      수정
                    </button>
                    <button 
                      className="modal-delete" 
                      onClick={() => {
                        handleDeleteEvent(editEvent.id);
                        setEditEvent(null);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 분류 관리 모달 */}
            {showManageCategory && (
              <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowManageCategory(false)}>
                <div className="modal-content manage-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>분류 관리</h3>
                  <div className="manage-actions">
                    <button className="manage-action-btn" onClick={() => {
                      setShowManageCategory(false);
                      setShowCreateCategory(true);
                    }}>
                      + 새 분류 생성
                    </button>
                  </div>
                  <div className="categories-list">
                    {categories.map((category) => (
                      <div key={category.id} className="manage-category-item">
                        <div className="category-info">
                          <span className="category-color-indicator" style={{ backgroundColor: category.color }}></span>
                          <span>{category.name}</span>
                        </div>
                        <div className="category-actions">
                          <button className="edit-btn" onClick={() => handleEditCategory(category)}>수정</button>
                          <button className="delete-btn" onClick={() => handleDeleteCategory(category.id)}>삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => setShowManageCategory(false)}>
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 분류 생성/수정 모달들 */}
            {showCreateCategory && (
              <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowCreateCategory(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>새 분류 생성</h3>
                  <div className="modal-form">
                    <label>
                      분류 이름
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="분류 이름 입력"
                        className="modal-input"
                        autoFocus
                      />
                    </label>
                    <ScheduleColorPresets
                      selectedColor={newCategoryColor}
                      onColorSelect={setNewCategoryColor}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => {
                      setShowCreateCategory(false);
                      setNewCategoryName('');
                      setNewCategoryColor('#FFF2B2');
                    }}>
                      취소
                    </button>
                    <button className="modal-confirm" onClick={handleCreateCategory}>
                      생성
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showEditCategory && (
              <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowEditCategory(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>분류 수정</h3>
                  <div className="modal-form">
                    <label>
                      분류 이름
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        placeholder="분류 이름 입력"
                        className="modal-input"
                        autoFocus
                      />
                    </label>
                    <ScheduleColorPresets
                      selectedColor={editCategoryColor}
                      onColorSelect={setEditCategoryColor}
                    />
                  </div>
                  <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => {
                      setShowEditCategory(null);
                      setEditCategoryName('');
                      setEditCategoryColor('#FFF2B2');
                    }}>
                      취소
                    </button>
                    <button className="modal-confirm" onClick={handleUpdateCategory}>
                      수정
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteCategoryConfirm && (
              <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setDeleteCategoryConfirm(null)}>
                <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>분류 삭제</h3>
                  <p>정말 삭제할까요?</p>
                  <div className="modal-actions">
                    <button className="modal-cancel" onClick={() => setDeleteCategoryConfirm(null)}>
                      취소
                    </button>
                    <button className="modal-confirm" onClick={confirmDeleteCategory}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}