/**
 * Google Calendar 이벤트 메타데이터 유틸리티
 * 커스텀 색상과 카테고리 ID를 description 필드에 저장/복원
 */

const METADATA_PREFIX = 'TODADOT_METADATA:';
const METADATA_SUFFIX = ':END_METADATA';

export interface EventMetadata {
  customColor?: string;
  categoryId?: string;
}

/**
 * 메타데이터를 JSON 문자열로 인코딩
 */
function encodeMetadata(metadata: EventMetadata): string {
  try {
    return JSON.stringify(metadata);
  } catch (error) {
    console.error('Failed to encode metadata:', error);
    return '';
  }
}

/**
 * 메타데이터 JSON 문자열 디코딩
 */
function decodeMetadata(encoded: string): EventMetadata | null {
  try {
    return JSON.parse(encoded) as EventMetadata;
  } catch (error) {
    console.error('Failed to decode metadata:', error);
    return null;
  }
}

/**
 * description에서 메타데이터 추출
 */
export function extractMetadata(description: string | undefined | null): EventMetadata | null {
  if (!description) {
    return null;
  }

  const startIndex = description.indexOf(METADATA_PREFIX);
  if (startIndex === -1) {
    return null;
  }

  const endIndex = description.indexOf(METADATA_SUFFIX, startIndex);
  if (endIndex === -1) {
    return null;
  }

  const metadataStart = startIndex + METADATA_PREFIX.length;
  const encodedMetadata = description.substring(metadataStart, endIndex);
  return decodeMetadata(encodedMetadata);
}

/**
 * description에서 메타데이터 제거 (사용자에게 보이는 텍스트만 반환)
 */
export function removeMetadataFromDescription(description: string | undefined | null): string {
  if (!description) {
    return '';
  }

  const startIndex = description.indexOf(METADATA_PREFIX);
  if (startIndex === -1) {
    return description;
  }

  const endIndex = description.indexOf(METADATA_SUFFIX, startIndex);
  if (endIndex === -1) {
    return description;
  }

  const beforeMetadata = description.substring(0, startIndex);
  const afterMetadata = description.substring(endIndex + METADATA_SUFFIX.length);
  return (beforeMetadata + afterMetadata).trim();
}

/**
 * description에 메타데이터 추가
 * @param originalDescription 원본 description (없으면 빈 문자열)
 * @param metadata 저장할 메타데이터
 */
export function addMetadataToDescription(
  originalDescription: string | undefined | null,
  metadata: EventMetadata
): string {
  // 기존 description에서 메타데이터 제거
  const cleanDescription = removeMetadataFromDescription(originalDescription || '');
  
  // 새로운 메타데이터 인코딩
  const encodedMetadata = encodeMetadata(metadata);
  if (!encodedMetadata) {
    return cleanDescription;
  }

  // 메타데이터를 description 끝에 추가
  const metadataBlock = `${METADATA_PREFIX}${encodedMetadata}${METADATA_SUFFIX}`;
  
  if (cleanDescription) {
    return `${cleanDescription}\n\n${metadataBlock}`;
  } else {
    return metadataBlock;
  }
}






