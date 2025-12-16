import { useState, useEffect } from 'react';
import './BottomSheet.css';

interface MemoTimeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'memo' | 'time';
  initialValue?: string;
  onSave: (value: string) => void;
  onDelete?: () => void;
}

export default function MemoTimeBottomSheet({
  isOpen,
  onClose,
  type,
  initialValue = '',
  onSave,
  onDelete,
}: MemoTimeBottomSheetProps) {
  const [memoText, setMemoText] = useState('');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (type === 'memo') {
        setMemoText(initialValue);
      } else if (type === 'time' && initialValue) {
        const [hour, minute] = initialValue.split(':');
        setSelectedHour(parseInt(hour));
        setSelectedMinute(parseInt(minute));
      } else {
        setSelectedHour(null);
        setSelectedMinute(null);
      }
    }
  }, [isOpen, type, initialValue]);

  const handleSave = () => {
    if (type === 'memo') {
      onSave(memoText);
    } else if (type === 'time' && selectedHour !== null && selectedMinute !== null) {
      const timeString = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`;
      onSave(timeString);
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bottom-sheet-overlay" onClick={handleOverlayClick}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h3>{type === 'memo' ? '메모' : '시간 설정'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bottom-sheet-content">
          {type === 'memo' ? (
            <div className="form-group">
              <label>메모</label>
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="메모를 입력하세요!"
                className="form-input"
                rows={5}
                style={{ resize: 'vertical' }}
                autoFocus
              />
            </div>
          ) : (
            <div className="form-group">
              <label>시간 선택</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#333', marginBottom: '8px', textAlign: 'center' }}>시</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px' }}>
                    {Array.from({ length: 24 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedHour(i)}
                        style={{
                          padding: '6px 12px',
                          background: selectedHour === i ? '#333' : 'white',
                          color: selectedHour === i ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#333', marginBottom: '8px', textAlign: 'center' }}>분</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '4px' }}>
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((min) => (
                      <button
                        key={min}
                        onClick={() => setSelectedMinute(min)}
                        style={{
                          padding: '6px 12px',
                          background: selectedMinute === min ? '#333' : 'white',
                          color: selectedMinute === min ? 'white' : '#333',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          textAlign: 'center',
                        }}
                      >
                        {String(min).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bottom-sheet-footer">
          <button className="cancel-btn" onClick={onClose}>취소</button>
          {onDelete && (type === 'memo' ? memoText : initialValue) && (
            <button className="cancel-btn" onClick={handleDelete} style={{ marginRight: '10px' }}>삭제</button>
          )}
          <button className="submit-btn" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  );
}












