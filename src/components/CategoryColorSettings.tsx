import { useState, useRef, useEffect } from 'react';
import './ColorPicker.css';
import { COLOR_PRESETS } from '../hooks/useQuadrantColors';

interface CategoryColorSettingsProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

// 매트릭스 컬러 세트에서 색상 16개 추출 (uncategorized 제외)
const getMatrixColors = (): string[] => {
  const colors: string[] = [];
  Object.values(COLOR_PRESETS).forEach((preset) => {
    colors.push(preset['urgent-important']);
    colors.push(preset['not-urgent-important']);
    colors.push(preset['urgent-not-important']);
    colors.push(preset['not-urgent-not-important']);
  });
  return colors;
};

export default function CategoryColorSettings({ color, onChange, label = "체크박스 색상" }: CategoryColorSettingsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  // 색상이 변경되면 HSL 추출 (미리 만들어진 색상 선택 시에도 업데이트)
  useEffect(() => {
    const rgb = hexToRgb(color);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
    }
  }, [color]);

  // HSL을 RGB로 변환
  const hslToRgb = (h: number, s: number, l: number) => {
    s /= 100;
    l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return { r, g, b };
  };

  // RGB를 HSL로 변환
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }

    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  // HEX를 RGB로 변환
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // RGB를 HEX로 변환
  const rgbToHex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  // HSL 변경 핸들러
  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value);
    setHue(newHue);
    const rgb = hslToRgb(newHue, saturation, lightness);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const handleSaturationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSaturation = parseInt(e.target.value);
    setSaturation(newSaturation);
    const rgb = hslToRgb(hue, newSaturation, lightness);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const handleLightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLightness = parseInt(e.target.value);
    setLightness(newLightness);
    const rgb = hslToRgb(hue, saturation, newLightness);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  // 캔버스 그리기
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 색상 그리드 그리기
    for (let x = 0; x < width; x++) {
      const s = (x / width) * 100;
      for (let y = 0; y < height; y++) {
        const l = 100 - (y / height) * 100;
        const rgb = hslToRgb(hue, s, l);
        ctx.fillStyle = rgbToHex(rgb.r, rgb.g, rgb.b);
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  // 캔버스 클릭 핸들러
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;

    const s = Math.max(0, Math.min(100, (x / width) * 100));
    const l = Math.max(0, Math.min(100, 100 - (y / height) * 100));
    setSaturation(s);
    setLightness(l);

    const rgb = hslToRgb(hue, s, l);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const currentRgb = hslToRgb(hue, saturation, lightness);
  const saturationGradient = `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`;
  const lightnessGradient = `linear-gradient(to right, hsl(${hue}, ${saturation}%, 0%), hsl(${hue}, ${saturation}%, 50%), hsl(${hue}, ${saturation}%, 100%))`;
  const matrixColors = getMatrixColors();

  return (
    <div className="color-picker-photoshop">
      <label className="color-picker-label">{label}</label>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(8, 1fr)', 
          gap: '8px',
          marginBottom: '12px'
        }}>
          {matrixColors.map((matrixColor, index) => (
            <button
              key={`matrix-${index}-${matrixColor}`}
              onClick={() => {
                // 먼저 HSL 상태를 업데이트한 후 onChange 호출
                const rgb = hexToRgb(matrixColor);
                if (rgb) {
                  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                  setHue(hsl.h);
                  setSaturation(hsl.s);
                  setLightness(hsl.l);
                  // 상태 업데이트 후 onChange 호출
                  onChange(matrixColor);
                } else {
                  onChange(matrixColor);
                }
              }}
              style={{
                width: '100%',
                aspectRatio: '1',
                backgroundColor: matrixColor,
                border: color === matrixColor ? '2px solid var(--accent-color)' : '2px solid transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: color === matrixColor ? '0 0 8px rgba(0, 0, 0, 0.3)' : 'none',
              }}
              aria-label={`매트릭스 색상 ${matrixColor} 선택`}
            />
          ))}
        </div>
      </div>
      <div className="color-picker-content">
        <div className="color-grid-container">
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            className="color-grid"
            onClick={handleCanvasClick}
          />
          <div
            className="color-preview"
            style={{
              backgroundColor: `rgb(${currentRgb.r}, ${currentRgb.g}, ${currentRgb.b})`,
            }}
          ></div>
        </div>
        <div className="color-controls">
          <div className="hue-slider-container">
            <label>H</label>
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="hue-slider"
            />
            <span>{hue}</span>
          </div>
          <div className="slider-container">
            <label>S</label>
            <input
              type="range"
              min="0"
              max="100"
              value={saturation}
              onChange={handleSaturationChange}
              className="slider saturation-slider"
              style={{ background: saturationGradient }}
            />
            <span>{saturation}</span>
          </div>
          <div className="slider-container">
            <label>L</label>
            <input
              type="range"
              min="0"
              max="100"
              value={lightness}
              onChange={handleLightnessChange}
              className="slider lightness-slider"
              style={{ background: lightnessGradient }}
            />
            <span>{lightness}</span>
          </div>
          <div className="rgb-display">
            <div>R: {currentRgb.r}</div>
            <div>G: {currentRgb.g}</div>
            <div>B: {currentRgb.b}</div>
          </div>
          <div className="hex-input-group">
            <label>HEX</label>
            <input
              type="text"
              value={rgbToHex(currentRgb.r, currentRgb.g, currentRgb.b).toUpperCase()}
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                  onChange(e.target.value);
                }
              }}
              className="hex-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

