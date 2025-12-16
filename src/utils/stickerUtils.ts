import { Sticker } from '../types';

/**
 * 스티커의 픽셀 위치를 퍼센트로 변환하여 반응형 위치 업데이트
 */
export function updateStickerPercentages(
  sticker: Sticker,
  containerWidth: number,
  containerHeight: number
): Sticker {
  return {
    ...sticker,
    xPercent: (sticker.positionX / containerWidth) * 100,
    yPercent: (sticker.positionY / containerHeight) * 100,
    widthPercent: (sticker.width / containerWidth) * 100,
    heightPercent: (sticker.height / containerHeight) * 100,
  };
}

/**
 * 스티커의 퍼센트 위치를 픽셀 위치로 계산
 */
export function calculatePixelPositions(
  sticker: Sticker,
  containerWidth: number,
  containerHeight: number
): Sticker {
  // 퍼센트 값이 있으면 픽셀 값 계산, 없으면 기존 픽셀 값 사용
  const x = sticker.xPercent !== undefined
    ? (sticker.xPercent / 100) * containerWidth
    : sticker.positionX;
  const y = sticker.yPercent !== undefined
    ? (sticker.yPercent / 100) * containerHeight
    : sticker.positionY;
  const width = sticker.widthPercent !== undefined
    ? (sticker.widthPercent / 100) * containerWidth
    : sticker.width;
  const height = sticker.heightPercent !== undefined
    ? (sticker.heightPercent / 100) * containerHeight
    : sticker.height;

  return {
    ...sticker,
    positionX: x,
    positionY: y,
    width,
    height,
  };
}

/**
 * 기존 스티커를 반응형 위치로 마이그레이션
 */
export function migrateStickerToResponsive(
  stickers: Sticker[],
  containerWidth: number,
  containerHeight: number
): Sticker[] {
  return stickers.map((sticker) => {
    // 이미 퍼센트 값이 있으면 그대로 사용
    if (sticker.xPercent !== undefined && sticker.yPercent !== undefined) {
      return sticker;
    }
    // 퍼센트 값이 없으면 계산하여 추가
    return updateStickerPercentages(sticker, containerWidth, containerHeight);
  });
}

/**
 * 스티커 위치를 컨테이너 경계 내로 제한
 */
export function clampStickerPosition(
  sticker: Sticker,
  containerWidth: number,
  containerHeight: number
): Sticker {
  const minX = -50; // 약간의 여유 공간
  const maxX = containerWidth - sticker.width + 50;
  const minY = -50;
  const maxY = containerHeight - sticker.height + 50;

  return {
    ...sticker,
    positionX: Math.max(minX, Math.min(maxX, sticker.positionX)),
    positionY: Math.max(minY, Math.min(maxY, sticker.positionY)),
  };
}











