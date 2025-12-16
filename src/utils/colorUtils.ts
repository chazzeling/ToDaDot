/**
 * HEX 색상 코드를 받아서 밝기를 판단하는 유틸리티 함수
 */

/**
 * HEX 색상 코드를 RGB 값으로 변환
 * @param hex - HEX 색상 코드 (예: "#FF0000" 또는 "FF0000")
 * @returns RGB 객체 { r, g, b }
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // # 제거
  const cleanHex = hex.replace('#', '');
  
  // rgba나 hsla 형식이면 null 반환
  if (cleanHex.includes('rgba') || cleanHex.includes('hsla') || cleanHex.includes('rgb') || cleanHex.includes('hsl')) {
    return null;
  }
  
  // 3자리 HEX를 6자리로 변환 (8자리 hex with alpha는 alpha 부분 제거)
  let processedHex = cleanHex;
  if (processedHex.length === 8) {
    processedHex = processedHex.substring(0, 6); // alpha 제거
  } else if (processedHex.length === 3) {
    processedHex = processedHex.split('').map(char => char + char).join('');
  }
  
  // 유효성 검사
  if (!/^[0-9A-Fa-f]{6}$/.test(processedHex)) {
    return null;
  }
  
  const r = parseInt(processedHex.substring(0, 2), 16);
  const g = parseInt(processedHex.substring(2, 4), 16);
  const b = parseInt(processedHex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * 다양한 색상 형식을 rgba로 변환
 * @param color - 색상 코드 (hex, rgba, hsla 등)
 * @returns rgba 형식의 색상 코드
 */
export function colorToRgba(color: string, opacity: number = 1): string {
  // 이미 rgba 형식인 경우
  if (color.startsWith('rgba')) {
    // opacity만 변경
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  
  // hsla 형식인 경우
  if (color.startsWith('hsla') || color.startsWith('hsl')) {
    // 임시 요소를 사용하여 rgba로 변환
    const tempDiv = document.createElement('div');
    tempDiv.style.color = color;
    document.body.appendChild(tempDiv);
    const rgb = window.getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);
    
    // rgb(r, g, b)를 rgba로 변환
    const match = rgb.match(/\d+/g);
    if (match && match.length >= 3) {
      return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})`;
    }
  }
  
  // hex 형식인 경우
  const rgb = hexToRgb(color);
  if (rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  }
  
  // 변환 실패 시 원본 반환
  return color;
}

/**
 * 배경색 HEX 코드를 받아서 밝거나 어두움을 반환하는 함수
 * @param hexColor - HEX 색상 코드 (또는 다른 형식의 색상)
 * @returns true면 밝음, false면 어두움
 */
export function isLight(color: string): boolean {
  let rgb: { r: number; g: number; b: number } | null = hexToRgb(color);
  
  if (!rgb) {
    // hex가 아닌 경우 (rgba, hsla 등) - 임시 요소로 변환 시도
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.color = color;
      document.body.appendChild(tempDiv);
      const computedColor = window.getComputedStyle(tempDiv).color;
      document.body.removeChild(tempDiv);
      
      // rgb(r, g, b) 형식 파싱
      const match = computedColor.match(/\d+/g);
      if (match && match.length >= 3) {
        rgb = {
          r: parseInt(match[0], 10),
          g: parseInt(match[1], 10),
          b: parseInt(match[2], 10),
        };
      } else {
        // 파싱 실패 시 기본값 (어두움으로 간주)
        return false;
      }
    } catch (e) {
      return false;
    }
  }
  
  // 상대 휘도(Relative Luminance) 계산
  // https://www.w3.org/WAI/GL/wiki/Relative_luminance
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  const luminance = 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  
  // 0.5보다 크면 밝음으로 간주
  return luminance > 0.5;
}
