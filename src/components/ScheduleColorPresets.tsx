import './EventColorPicker.css';

interface ScheduleColorPresetsProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const pastelColors = [
  '#ffccceff',
  '#FFD9B3',
  '#FFF2B2',
  '#b7ffcdff',
  '#c7c9ffff',
  '#e0c6ffff',
];

const vibrantColors = [
  '#f08383ff',
  '#fab67eff',
  '#fff78aff',
  '#97e06cff',
  '#93b9ffff',
  '#a677ffff',
];

const darkModeColors = [
  '#FFC94A', // Rich Gold
  '#B5B5B5', // Polished Silver
  '#476B9C', // Deep Sea Blue
  '#D96A6A', // Raspberry Red
  '#F2F2F2', // 변경됨
  '#598FC2', // 변경됨
];

const grassColors = [
  '#82B44E', // Grass Green
  '#7A7C4C', // Olive Green
  '#008080', // Teal
  '#336633', // Deep Forest
  '#C3E8A9', // Pale Yellow Green
  '#3CB371', // Medium Green
];

const accessibleColors = [
  '#E07477', // 접근성 높은 색상 세트
  '#F9DAD6',
  '#E0A878',
  '#C6E57E',
  '#5567E0',
  '#CCAFFA',
];

export default function ScheduleColorPresets({ selectedColor, onColorSelect }: ScheduleColorPresetsProps) {
  return (
    <div className="event-color-picker">
      <div className="color-chips">
        <div className="color-group">
          <span className="color-group-label">파스텔</span>
          <div className="color-chip-row">
            {pastelColors.map((color) => (
              <button
                key={color}
                className={`color-chip ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect(color)}
                aria-label={`색상 ${color} 선택`}
              />
            ))}
          </div>
        </div>
        <div className="color-group">
          <span className="color-group-label">원색</span>
          <div className="color-chip-row">
            {vibrantColors.map((color) => (
              <button
                key={color}
                className={`color-chip ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect(color)}
                aria-label={`색상 ${color} 선택`}
              />
            ))}
          </div>
        </div>
        <div className="color-group">
          <span className="color-group-label">다크 모드</span>
          <div className="color-chip-row">
            {darkModeColors.map((color) => (
              <button
                key={color}
                className={`color-chip ${selectedColor === color ? 'selected' : ''}`}
                style={{ 
                  backgroundColor: color,
                  border: color === '#F2F2F2' ? `1px solid var(--border-color)` : undefined 
                }}
                onClick={() => onColorSelect(color)}
                aria-label={`색상 ${color} 선택`}
              />
            ))}
          </div>
        </div>
        <div className="color-group">
          <span className="color-group-label">풀잎</span>
          <div className="color-chip-row">
            {grassColors.map((color) => (
              <button
                key={color}
                className={`color-chip ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect(color)}
                aria-label={`색상 ${color} 선택`}
              />
            ))}
          </div>
        </div>
        <div className="color-group">
          <span className="color-group-label">접근성 높은 색상</span>
          <div className="color-chip-row">
            {accessibleColors.map((color) => (
              <button
                key={color}
                className={`color-chip ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => onColorSelect(color)}
                aria-label={`색상 ${color} 선택`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}







