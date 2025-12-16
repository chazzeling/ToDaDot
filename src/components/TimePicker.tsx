import { useState, useEffect, useRef } from 'react';
import './TimePicker.css';

interface TimePickerProps {
  value?: string; // HH:mm 형식
  onChange: (time: string | undefined) => void;
  usePopup?: boolean; // 팝업 모드 사용 여부
  buttonLabel?: string; // 버튼에 표시할 라벨 (팝업 모드일 때)
}

export default function TimePicker({ value, onChange, usePopup = false, buttonLabel = '시간' }: TimePickerProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // value가 변경되면 내부 상태 업데이트
  useEffect(() => {
    if (value && typeof value === 'string' && value.includes(':')) {
      try {
        const [hour, minute] = value.split(':').map(Number);
        if (!isNaN(hour) && !isNaN(minute)) {
          setSelectedHour(hour);
          setSelectedMinute(minute);
        } else {
          setSelectedHour(null);
          setSelectedMinute(null);
        }
      } catch (error) {
        console.error('TimePicker: Invalid time format:', value, error);
        setSelectedHour(null);
        setSelectedMinute(null);
      }
    } else {
      setSelectedHour(null);
      setSelectedMinute(null);
    }
  }, [value]);

  const handleHourSelect = (hour: number) => {
    setSelectedHour(hour);
    const minute = selectedMinute !== null ? selectedMinute : 0;
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const handleMinuteSelect = (minute: number) => {
    setSelectedMinute(minute);
    const hour = selectedHour !== null ? selectedHour : 0;
    onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };

  const handleClear = () => {
    setSelectedHour(null);
    setSelectedMinute(null);
    onChange(undefined);
  };

  // 시: 0-23 (배열로 변환)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // 분: 00-55 (5분 단위, 배열로 변환)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  // 팝업 외부 클릭 감지
  useEffect(() => {
    if (usePopup && showPopup) {
      const handleClickOutside = (event: MouseEvent) => {
        if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
          setShowPopup(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [usePopup, showPopup]);

  const handleToggle = () => {
    if (usePopup) {
      setShowPopup(!showPopup);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const pickerContent = (
    <div className="time-picker-content">
      {/* 시 선택 */}
      <div className="time-picker-section">
        <div className="time-picker-label">시</div>
        <div className="time-picker-buttons">
          {hours.map((hour) => (
            <button
              key={`hour-${hour}`}
              className={`time-picker-button ${selectedHour === hour ? 'selected' : ''}`}
              onClick={() => handleHourSelect(hour)}
            >
              {hour}
            </button>
          ))}
        </div>
      </div>

      {/* 분 선택 */}
      <div className="time-picker-section">
        <div className="time-picker-label">분</div>
        <div className="time-picker-buttons">
          {minutes.map((minute) => (
            <button
              key={`minute-${minute}`}
              className={`time-picker-button ${selectedMinute === minute ? 'selected' : ''}`}
              onClick={() => handleMinuteSelect(minute)}
            >
              {String(minute).padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // 버튼에 표시할 텍스트: 시간이 설정되어 있으면 시간을 표시, 없으면 라벨 표시
  const buttonDisplayText = (selectedHour !== null && selectedMinute !== null)
    ? `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
    : buttonLabel;

  if (usePopup) {
    return (
      <>
        <div className="time-picker-popup-wrapper">
          <button 
            className="time-picker-popup-button"
            onClick={handleToggle}
            type="button"
          >
            {buttonDisplayText}
            <span className="time-picker-toggle-icon">{showPopup ? '▼' : '▶'}</span>
          </button>
          {(selectedHour !== null || selectedMinute !== null) && (
            <button className="time-picker-clear-separate" onClick={handleClear} type="button">
              초기화
            </button>
          )}
        </div>
        {showPopup && (
          <div className="time-picker-popup-overlay" onClick={() => setShowPopup(false)}>
            <div 
              ref={pickerRef}
              className="time-picker-popup" 
              onClick={(e) => e.stopPropagation()}
            >
              {pickerContent}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="time-picker">
      <div className="time-picker-header">
        <button 
          className="time-picker-toggle"
          onClick={handleToggle}
          type="button"
        >
          <label>시간</label>
          <span className="time-picker-toggle-icon">{isExpanded ? '▼' : '▶'}</span>
        </button>
        {(selectedHour !== null || selectedMinute !== null) && (
          <button className="time-picker-clear" onClick={handleClear} type="button">
            초기화
          </button>
        )}
      </div>

      {isExpanded && pickerContent}
    </div>
  );
}

