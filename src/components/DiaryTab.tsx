import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DateString } from '../types';
import Calendar from './Calendar';
import TextFormatToolbar from './TextFormatToolbar';
import RichTextEditor from './RichTextEditor';
import MoodColorPicker from './MoodColorPicker';
import TimePicker from './TimePicker';
import { Clock, Nut, Bed, Target, ThumbsUp, Paintbrush, BadgeCheck, Pill, X, ChevronDown, ChevronUp, PawPrint } from 'lucide-react';
import './DiaryTab.css';

interface DiaryTabProps {
  selectedDate: DateString;
  onDateSelect: (date: DateString) => void;
  datesWithDiaries?: DateString[];
  datesWithMemos?: DateString[];
  moods?: { date: string; color: string }[];
  onMoodSelect?: (date: DateString, color: string) => void;
}

interface DiaryEntry {
  date: DateString;
  goal: string;
  goodThings: string;
  sleepStart: string; // "HH:mm" 형식
  sleepEnd: string; // "HH:mm" 형식
  meals: string;
  diary: string;
  symptoms?: string[]; // 증상 태그 배열
}

const STORAGE_KEY = 'diary-entries';

// 무드 트래킹용 PawPrint 컴포넌트
function MoodPawPrints({ color }: { color: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pawCount, setPawCount] = useState(5);
  
  useEffect(() => {
    const updatePawCount = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        // 너비에 따라 paw 개수 조절 (약 40px당 1개)
        const count = Math.max(3, Math.min(10, Math.floor(width / 40)));
        setPawCount(count);
      }
    };
    
    updatePawCount();
    window.addEventListener('resize', updatePawCount);
    return () => window.removeEventListener('resize', updatePawCount);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '6px',
        padding: '12px',
        width: '100%',
        minHeight: '50px',
      }}
    >
      {Array.from({ length: pawCount }).map((_, index) => (
        <PawPrint
          key={index}
          size={24}
          fill={color}
          color={color}
          style={{ flexShrink: 0 }}
        />
      ))}
    </div>
  );
}

// 일기 탭의 rich-text-editor에 내용이 있는 날짜 목록 반환
export function getDatesWithDiaryContent(): DateString[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    
    const allEntries: Record<DateString, DiaryEntry> = JSON.parse(saved);
    return Object.keys(allEntries).filter(date => {
      const entry = allEntries[date];
      // diary 필드에 내용이 있는지 확인 (HTML 태그 제거 후 텍스트만 확인)
      if (!entry.diary) return false;
      const textContent = entry.diary.replace(/<[^>]*>/g, '').trim();
      return textContent.length > 0;
    });
  } catch (e) {
    console.error('Failed to get dates with diary content:', e);
    return [];
  }
}

export default function DiaryTab({ 
  selectedDate, 
  onDateSelect,
  datesWithDiaries = [],
  datesWithMemos = [],
  moods = [],
  onMoodSelect,
}: DiaryTabProps) {
  const [diaryEntry, setDiaryEntry] = useState<DiaryEntry>(() => ({
    date: selectedDate,
    goal: '',
    goodThings: '',
    sleepStart: '',
    sleepEnd: '',
    meals: '',
    diary: '',
    symptoms: [],
  }));
  
  // 저장된 내용 표시용 상태
  const [savedContents, setSavedContents] = useState<{
    goal: string;
    goodThings: string;
    meals: string;
  }>({
    goal: '',
    goodThings: '',
    meals: '',
  });
  
  // 증상 입력 상태
  const [symptomInput, setSymptomInput] = useState('');
  
  // 접기/펼치기 상태
  const [collapsedFields, setCollapsedFields] = useState<{
    goal: boolean;
    goodThings: boolean;
    meals: boolean;
    symptoms: boolean;
  }>({
    goal: false,
    goodThings: false,
    meals: false,
    symptoms: false,
  });
  
  const toggleFieldCollapse = useCallback((field: 'goal' | 'goodThings' | 'meals' | 'symptoms') => {
    setCollapsedFields(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [completedFields, setCompletedFields] = useState<Record<string, boolean>>({});
  
  const currentMood = moods.find(m => m.date === selectedDate);
  
  // 무드 색상 이름 가져오기 (localStorage 변경 감지)
  const [moodColorNames, setMoodColorNames] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('mood-color-names');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load mood color names:', error);
    }
    return {};
  });

  // localStorage 변경 감지를 위한 이벤트 리스너
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mood-color-names' && e.newValue) {
        try {
          setMoodColorNames(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Failed to parse mood color names:', error);
        }
      }
    };

    // 다른 탭/창에서의 변경 감지
    window.addEventListener('storage', handleStorageChange);

    // 같은 탭에서의 변경 감지 (polling)
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem('mood-color-names');
        if (saved) {
          const parsed = JSON.parse(saved);
          setMoodColorNames(prev => {
            // 변경사항이 있는지 확인
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(parsed);
            if (prevStr !== newStr) {
              return parsed;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to check mood color names:', error);
      }
    }, 500); // 500ms마다 확인

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);
  
  // 현재 무드 색상의 이름 가져오기
  const getMoodColorName = useCallback((color: string): string => {
    // 커스텀 이름이 있으면 사용
    if (moodColorNames[color]) {
      return moodColorNames[color];
    }
    
    // 커스텀 색상 배열에서 찾기
    try {
      const customColorsSaved = localStorage.getItem('mood-custom-colors');
      if (customColorsSaved) {
        const customColors: Array<{ color: string; name: string }> = JSON.parse(customColorsSaved);
        const customColor = customColors.find(c => c.color === color || c.color.toLowerCase() === color.toLowerCase());
        if (customColor) {
          return customColor.name;
        }
      }
    } catch (error) {
      console.error('Failed to load custom colors:', error);
    }
    
    // 기본 색상 이름 매핑
    const defaultColorNames: Record<string, string> = {
      '#ffccceff': '밝은 분홍',
      '#FFD9B3': '복숭아',
      '#FFF2B2': '노랑',
      '#b7ffcdff': '연두',
      '#c7c9ffff': '연보라',
      '#e0c6ffff': '라벤더',
      '#E07477': '산호빨강',
      '#F9DAD6': '베이지',
      '#E0A878': '황토',
      '#C6E57E': '라임',
      '#5567E0': '네이비',
      '#CCAFFA': '라일락',
      '#E8E8E8': '옅은 회색',
      '#C0C0C0': '회색',
      '#A0A0A0': '중간 회색',
      '#707070': '진한 회색',
      '#505050': '어두운 회색',
      '#202020': '검정에 가까운 회색',
    };
    
    return defaultColorNames[color] || color;
  }, [moodColorNames]);

  // 날짜별 일기 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const allEntries: Record<DateString, DiaryEntry> = JSON.parse(saved);
        if (allEntries[selectedDate]) {
          const entry = allEntries[selectedDate];
          // sleepStart와 sleepEnd가 유효한 문자열 형식인지 검증
          const validatedEntry: DiaryEntry = {
            ...entry,
            sleepStart: (typeof entry.sleepStart === 'string' && entry.sleepStart.includes(':')) 
              ? entry.sleepStart 
              : '',
            sleepEnd: (typeof entry.sleepEnd === 'string' && entry.sleepEnd.includes(':')) 
              ? entry.sleepEnd 
              : '',
            goal: typeof entry.goal === 'string' ? entry.goal : '',
            goodThings: typeof entry.goodThings === 'string' ? entry.goodThings : '',
            meals: typeof entry.meals === 'string' ? entry.meals : '',
            diary: typeof entry.diary === 'string' ? entry.diary : '',
            symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : [],
          };
          setDiaryEntry(validatedEntry);
          // 저장된 내용도 업데이트
          setSavedContents({
            goal: validatedEntry.goal,
            goodThings: validatedEntry.goodThings,
            meals: validatedEntry.meals,
          });
        } else {
          setDiaryEntry({
            date: selectedDate,
            goal: '',
            goodThings: '',
            sleepStart: '',
            sleepEnd: '',
            meals: '',
            diary: '',
            symptoms: [],
          });
          setSavedContents({
            goal: '',
            goodThings: '',
            meals: '',
          });
        }
      } catch (e) {
        console.error('Failed to load diary entries:', e);
        setDiaryEntry({
          date: selectedDate,
          goal: '',
          goodThings: '',
          sleepStart: '',
          sleepEnd: '',
          meals: '',
          diary: '',
          symptoms: [],
        });
        setSavedContents({
          goal: '',
          goodThings: '',
          meals: '',
        });
      }
    } else {
      setDiaryEntry({
        date: selectedDate,
        goal: '',
        goodThings: '',
        sleepStart: '',
        sleepEnd: '',
        meals: '',
        diary: '',
        symptoms: [],
      });
      setSavedContents({
        goal: '',
        goodThings: '',
        meals: '',
      });
    }
  }, [selectedDate]);

  // 데이터 저장
  const saveEntry = useCallback((entry: DiaryEntry) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let allEntries: Record<DateString, DiaryEntry> = {};
    if (saved) {
      try {
        allEntries = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse diary entries:', e);
      }
    }
    allEntries[entry.date] = entry;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEntries));
  }, []);
  
  // 필드 완료 처리
  const handleFieldComplete = useCallback((field: 'goal' | 'goodThings' | 'meals' | 'diary') => {
    setCompletedFields(prev => ({ ...prev, [field]: true }));
    saveEntry(diaryEntry);
    
    // 저장된 내용 업데이트
    if (field === 'goal' || field === 'goodThings' || field === 'meals') {
      setSavedContents(prev => ({
        ...prev,
        [field]: diaryEntry[field],
      }));
    }
    
    // 1초 후 애니메이션 제거
    setTimeout(() => {
      setCompletedFields(prev => ({ ...prev, [field]: false }));
    }, 1000);
  }, [diaryEntry, saveEntry]);
  
  // 증상 추가
  const handleAddSymptom = useCallback(() => {
    if (symptomInput.trim()) {
      const updatedEntry = {
        ...diaryEntry,
        symptoms: [...(diaryEntry.symptoms || []), symptomInput.trim()],
      };
      setDiaryEntry(updatedEntry);
      saveEntry(updatedEntry);
      setSymptomInput('');
    }
  }, [symptomInput, diaryEntry, saveEntry]);
  
  // 증상 삭제
  const handleRemoveSymptom = useCallback((index: number) => {
    const updatedSymptoms = [...(diaryEntry.symptoms || [])];
    updatedSymptoms.splice(index, 1);
    const updatedEntry = {
      ...diaryEntry,
      symptoms: updatedSymptoms,
    };
    setDiaryEntry(updatedEntry);
    saveEntry(updatedEntry);
  }, [diaryEntry, saveEntry]);

  // 시각을 분으로 변환 (24시간 범위, 0~1440분)
  const timeToMinutes24 = (timeStr: string | undefined | null): number | null => {
    // 문자열이 아니거나 빈 값인 경우 null 반환 (초기화 상태)
    if (!timeStr || typeof timeStr !== 'string' || timeStr.trim() === '') {
      return null;
    }
    const [hours, mins] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(mins)) return null;
    return hours * 60 + mins;
  };

  const handleFieldChange = useCallback((field: keyof DiaryEntry, value: string) => {
    setDiaryEntry(prev => {
      const updated = { ...prev, [field]: value };
      // 변경 시 자동 저장
      saveEntry(updated);
      return updated;
    });
  }, [saveEntry]);
  
  // 총 수면 시간 계산
  const calculateSleepHours = useCallback(() => {
    try {
      if (!diaryEntry?.sleepStart || !diaryEntry?.sleepEnd) return '';
      
      const sleepStartMinutes = timeToMinutes24(diaryEntry.sleepStart);
      const sleepEndMinutes = timeToMinutes24(diaryEntry.sleepEnd);
      
      let totalMinutes: number;
      if (sleepEndMinutes >= sleepStartMinutes) {
        totalMinutes = sleepEndMinutes - sleepStartMinutes;
      } else {
        // 자정을 넘어가는 경우
        totalMinutes = (1440 - sleepStartMinutes) + sleepEndMinutes;
      }
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      
      if (hours === 0 && minutes === 0) return '';
      if (minutes === 0) return `${hours}시간`;
      return `${hours}시간 ${minutes}분`;
    } catch (error) {
      console.error('Error calculating sleep hours:', error);
      return '';
    }
  }, [diaryEntry?.sleepStart, diaryEntry?.sleepEnd]);

  return (
    <div id="diary-view" className="diary-tab">
      <div className="diary-content">
        {/* 왼쪽: 미니 달력 */}
        <aside className="diary-sidebar">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            events={[]}
            isExpanded={false}
            showMoodTracker={false}
            datesWithMemos={datesWithMemos}
            datesWithDiaries={datesWithDiaries}
            activeTab="diary"
            todos={[]}
            moodEntries={moods}
          />
          {/* 취침-기상 시각 표시 영역 */}
          <div className="diary-sleep-section">
            <div className="diary-field-row">
              <label>
                <Bed size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                취침-기상 시각
              </label>
              {(() => {
                try {
                  const sleepHours = calculateSleepHours();
                  return sleepHours ? (
                    <span className="sleep-hours-display">{sleepHours}</span>
                  ) : null;
                } catch (error) {
                  console.error('Error displaying sleep hours:', error);
                  return null;
                }
              })()}
            </div>
            <div className="sleep-time-selector-single">
              {/* 취침-기상 시간 범위 표시 */}
              <div className="sleep-clock-wrapper">
                <div className="sleep-circle">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className="hour-marker"
                      style={{
                        transform: `rotate(${hour * 15}deg) translateY(-49px)`,
                      }}
                    >
                      <span className="hour-label" style={{ transform: `rotate(-${hour * 15}deg)` }}>
                        {hour}
                      </span>
                    </div>
                  ))}
                  {(() => {
                    try {
                      const sleepStartMinutes = timeToMinutes24(diaryEntry?.sleepStart);
                      const sleepEndMinutes = timeToMinutes24(diaryEntry?.sleepEnd);
                      
                      // 초기화 상태이거나 둘 다 null인 경우 표시하지 않음
                      if (sleepStartMinutes === null || sleepEndMinutes === null) return null;
                      
                      const center = 56;
                      const radius = 49;
                      const startAngleRad = ((sleepStartMinutes / 1440) * 360 - 90) * (Math.PI / 180);
                      const endAngleRad = ((sleepEndMinutes / 1440) * 360 - 90) * (Math.PI / 180);
                      const startX = Math.cos(startAngleRad) * radius;
                      const startY = Math.sin(startAngleRad) * radius;
                      const endX = Math.cos(endAngleRad) * radius;
                      const endY = Math.sin(endAngleRad) * radius;
                      
                      let angleDiff;
                      if (sleepEndMinutes >= sleepStartMinutes) {
                        angleDiff = ((sleepEndMinutes - sleepStartMinutes) / 1440) * 360;
                      } else {
                        angleDiff = ((1440 - sleepStartMinutes + sleepEndMinutes) / 1440) * 360;
                      }
                      
                      const largeArcFlag = angleDiff > 180 ? 1 : 0;
                      
                      if (sleepEndMinutes >= sleepStartMinutes) {
                        return (
                          <svg 
                            className="sleep-range-indicator"
                            width="112" 
                            height="112" 
                            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1 }}
                            viewBox="0 0 112 112"
                          >
                            <path
                              d={`M ${center} ${center} L ${center + startX} ${center + startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${center + endX} ${center + endY} Z`}
                              fill="var(--accent-color)"
                              opacity="0.3"
                            />
                          </svg>
                        );
                      } else {
                        const firstEndAngleRad = (-90) * (Math.PI / 180);
                        const firstEndX = Math.cos(firstEndAngleRad) * radius;
                        const firstEndY = Math.sin(firstEndAngleRad) * radius;
                        const secondStartAngleRad = (270) * (Math.PI / 180);
                        const secondStartX = Math.cos(secondStartAngleRad) * radius;
                        const secondStartY = Math.sin(secondStartAngleRad) * radius;
                        const firstAngleDiff = ((1440 - sleepStartMinutes) / 1440) * 360;
                        const secondAngleDiff = (sleepEndMinutes / 1440) * 360;
                        
                        return (
                          <svg 
                            className="sleep-range-indicator"
                            width="112" 
                            height="112" 
                            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 1 }}
                            viewBox="0 0 112 112"
                          >
                            <path
                              d={`M ${center} ${center} L ${center + startX} ${center + startY} A ${radius} ${radius} 0 ${firstAngleDiff > 180 ? 1 : 0} 1 ${center + firstEndX} ${center + firstEndY} Z`}
                              fill="var(--accent-color)"
                              opacity="0.3"
                            />
                            <path
                              d={`M ${center} ${center} L ${center + secondStartX} ${center + secondStartY} A ${radius} ${radius} 0 ${secondAngleDiff > 180 ? 1 : 0} 1 ${center + endX} ${center + endY} Z`}
                              fill="var(--accent-color)"
                              opacity="0.3"
                            />
                          </svg>
                        );
                      }
                    } catch (error) {
                      console.error('Error rendering sleep range:', error);
                      return null;
                    }
                  })()}
                </div>
              </div>
              <div className="sleep-time-inputs-row">
                <div className="sleep-time-input-group">
                  <TimePicker
                    value={typeof diaryEntry.sleepStart === 'string' ? diaryEntry.sleepStart : undefined}
                    onChange={(time) => handleFieldChange('sleepStart', typeof time === 'string' ? time : '')}
                    usePopup={true}
                    buttonLabel="취침 시간 설정"
                  />
                </div>
                <div className="sleep-time-input-group">
                  <TimePicker
                    value={typeof diaryEntry.sleepEnd === 'string' ? diaryEntry.sleepEnd : undefined}
                    onChange={(time) => handleFieldChange('sleepEnd', typeof time === 'string' ? time : '')}
                    usePopup={true}
                    buttonLabel="기상 시간 설정"
                  />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인: 좌우 패널 */}
        <main className="diary-main">
          {/* 좌측 패널: 목표, 잘한 일, 취침시각, 식단 */}
          <div className="diary-left-panel">
            <div className="diary-fields">
              {/* 1. 오늘의 목표 */}
              <div className="diary-field-wrapper">
                <div className="diary-field-row">
                  <label>
                    <Target size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    오늘의 목표
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="diary-collapse-btn"
                      onClick={() => toggleFieldCollapse('goal')}
                      title={collapsedFields.goal ? "펼치기" : "접기"}
                    >
                      {collapsedFields.goal ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                      className="diary-complete-btn"
                      onClick={() => handleFieldComplete('goal')}
                      title="입력 완료"
                    >
                      <BadgeCheck size={16} />
                    </button>
                  </div>
                </div>
                {!collapsedFields.goal && (
                  <textarea
                    value={diaryEntry.goal}
                    onChange={(e) => handleFieldChange('goal', e.target.value)}
                    placeholder="기록하기 🍀"
                    className={`diary-input ${completedFields.goal ? 'completed' : ''}`}
                    rows={1}
                  />
                )}
                {savedContents.goal && (
                  <div className="diary-saved-note">
                    {savedContents.goal}
                  </div>
                )}
              </div>

              {/* 2. 오늘 잘한 일 */}
              <div className="diary-field-wrapper">
                <div className="diary-field-row">
                  <label>
                    <ThumbsUp size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    오늘 잘한 일
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="diary-collapse-btn"
                      onClick={() => toggleFieldCollapse('goodThings')}
                      title={collapsedFields.goodThings ? "펼치기" : "접기"}
                    >
                      {collapsedFields.goodThings ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                      className="diary-complete-btn"
                      onClick={() => handleFieldComplete('goodThings')}
                      title="입력 완료"
                    >
                      <BadgeCheck size={16} />
                    </button>
                  </div>
                </div>
                {!collapsedFields.goodThings && (
                  <textarea
                    value={diaryEntry.goodThings}
                    onChange={(e) => handleFieldChange('goodThings', e.target.value)}
                    placeholder="기록하기 ✌️"
                    className={`diary-input ${completedFields.goodThings ? 'completed' : ''}`}
                    rows={1}
                  />
                )}
                {savedContents.goodThings && (
                  <div className="diary-saved-note">
                    {savedContents.goodThings}
                  </div>
                )}
              </div>

              {/* 4. 오늘의 식단 */}
              <div className="diary-field-wrapper">
                <div className="diary-field-row">
                  <label>
                    <Nut size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    오늘의 식단
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      className="diary-collapse-btn"
                      onClick={() => toggleFieldCollapse('meals')}
                      title={collapsedFields.meals ? "펼치기" : "접기"}
                    >
                      {collapsedFields.meals ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <button
                      className="diary-complete-btn"
                      onClick={() => handleFieldComplete('meals')}
                      title="입력 완료"
                    >
                      <BadgeCheck size={16} />
                    </button>
                  </div>
                </div>
                {!collapsedFields.meals && (
                  <textarea
                    value={diaryEntry.meals}
                    onChange={(e) => handleFieldChange('meals', e.target.value)}
                    placeholder="기록하기 🍳"
                    className={`diary-input ${completedFields.meals ? 'completed' : ''}`}
                    rows={1}
                  />
                )}
                {savedContents.meals && (
                  <div className="diary-saved-note">
                    {savedContents.meals}
                  </div>
                )}
              </div>

              {/* 증상 기록 */}
              <div className="diary-field-wrapper">
                <div className="diary-field-row">
                  <label>
                    <Pill size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    증상
                  </label>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <button
                      className="diary-collapse-btn"
                      onClick={() => toggleFieldCollapse('symptoms')}
                      title={collapsedFields.symptoms ? "펼치기" : "접기"}
                    >
                      {collapsedFields.symptoms ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    {diaryEntry.symptoms && diaryEntry.symptoms.length > 0 && (
                      <button
                        onClick={() => {
                          const updatedEntry = {
                            ...diaryEntry,
                            symptoms: [],
                          };
                          setDiaryEntry(updatedEntry);
                          saveEntry(updatedEntry);
                        }}
                        className="diary-complete-btn"
                        title="모든 증상 삭제"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <button
                      className="diary-complete-btn"
                      onClick={handleAddSymptom}
                      disabled={!symptomInput.trim()}
                      title="입력 완료"
                    >
                      <BadgeCheck size={16} />
                    </button>
                  </div>
                </div>
                {!collapsedFields.symptoms && (
                  <input
                    type="text"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSymptom();
                      }
                    }}
                    placeholder={(diaryEntry.symptoms && diaryEntry.symptoms.length > 0) ? "증상 추가" : "기록하기 💊"}
                    className="symptom-input"
                  />
                )}
                {diaryEntry.symptoms && diaryEntry.symptoms.length > 0 && (
                  <div className="symptom-tags">
                    {diaryEntry.symptoms.map((symptom, index) => (
                      <span key={index} className="symptom-tag">
                        {symptom}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* 우측 패널: 일기 작성 */}
          <div className="diary-right-panel">
            {/* 무드 트래킹 */}
            <div className="diary-field-wrapper" style={{ marginBottom: '16px' }}>
              <div className="diary-field-row">
                <label>
                  <Paintbrush size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  무드 트래킹{currentMood && `: ${getMoodColorName(currentMood.color)}`}
                </label>
              </div>
              <div className="mood-tracker-wrapper">
                {currentMood ? (
                  <div 
                    className="mood-display"
                    onClick={() => setShowMoodPicker(true)}
                  >
                    <MoodPawPrints color={currentMood.color} />
                  </div>
                ) : (
                  <button 
                    className="mood-add-btn"
                    onClick={() => setShowMoodPicker(true)}
                  >
                    무드 선택
                  </button>
                )}
                {showMoodPicker && (
                  <div className="mood-picker-overlay" onClick={() => setShowMoodPicker(false)}>
                    <div className="mood-picker-container" onClick={(e) => e.stopPropagation()}>
                      <MoodColorPicker
                        onColorSelect={(color) => {
                          // 색상 선택 시 즉시 저장
                          if (onMoodSelect) {
                            onMoodSelect(selectedDate, color);
                          }
                          setShowMoodPicker(false);
                        }}
                        onSave={(color) => {
                          // 저장 버튼 클릭 시
                          if (onMoodSelect) {
                            onMoodSelect(selectedDate, color);
                          }
                          setShowMoodPicker(false);
                        }}
                        onCancel={() => {
                          setShowMoodPicker(false);
                        }}
                        selectedColor={currentMood?.color}
                        selectedDate={selectedDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="diary-editor-wrapper">
              <div className="diary-field-row">
                <label>일기</label>
                <button
                  className="diary-complete-btn"
                  onClick={() => handleFieldComplete('diary')}
                  title="입력 완료"
                >
                  <BadgeCheck size={16} />
                </button>
              </div>
              <div className={`diary-main-editor ${completedFields.diary ? 'completed' : ''}`}>
                <TextFormatToolbar editorRef={editorRef} />
                <RichTextEditor
                  ref={editorRef}
                  value={diaryEntry.diary}
                  onChange={(html, text) => handleFieldChange('diary', html)}
                  placeholder="기록하기 ✒️"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}