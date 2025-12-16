// PNG 내보내기 유틸리티 함수 - html2canvas 사용

import html2canvas from 'html2canvas';

interface ImageExportOptions {
  scale?: number;
  backgroundColor?: string;
  useCORS?: boolean;
  logging?: boolean;
}

// HTML 요소를 PNG 이미지로 내보내기
export async function exportToPNG(
  elements: HTMLElement[],
  filename: string = 'export.png',
  options?: ImageExportOptions
): Promise<void> {
  try {
    if (elements.length === 0) {
      throw new Error('내보낼 요소가 없습니다.');
    }

    console.log('📸 PNG 내보내기 시작...');
    console.log('📏 요소 개수:', elements.length);

    // 여러 요소를 하나의 이미지로 합치기
    const canvases: HTMLCanvasElement[] = [];

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (!element) continue;

      console.log(`📸 요소 ${i + 1}/${elements.length} 캡처 중...`);
      console.log('   요소 크기:', element.scrollWidth, 'x', element.scrollHeight);

      // 요소를 복제하여 스크롤 문제 해결
      const clone = element.cloneNode(true) as HTMLElement;
      
      // 원본 요소의 모든 computed style 가져오기
      const originalComputed = window.getComputedStyle(element);
      
      // 복제본을 화면에 보이도록 설정 (하지만 사용자에게는 보이지 않게)
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = `${Math.max(element.scrollWidth, element.clientWidth, element.offsetWidth)}px`;
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.maxHeight = 'none';
      clone.style.visibility = 'visible';
      clone.style.display = originalComputed.display === 'none' ? 'block' : originalComputed.display;
      clone.style.opacity = '1';
      clone.style.zIndex = '999999';
      clone.style.background = originalComputed.background || originalComputed.backgroundColor || '#ffffff';
      clone.style.backgroundColor = originalComputed.backgroundColor || '#ffffff';
      
      // 모든 스크롤 가능한 요소의 스타일 수정
      const allScrollableElements = clone.querySelectorAll('*');
      allScrollableElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          const computed = window.getComputedStyle(el);
          if (computed.overflow === 'auto' || computed.overflow === 'scroll' || computed.overflowY === 'auto' || computed.overflowY === 'scroll') {
            el.style.overflow = 'visible';
            el.style.maxHeight = 'none';
            el.style.height = 'auto';
          }
          // 숨겨진 요소도 보이도록
          if (computed.visibility === 'hidden') {
            el.style.visibility = 'visible';
          }
          if (computed.display === 'none') {
            el.style.display = 'block';
          }
        }
      });

      // 체크박스 스타일 강제 적용 (html2canvas가 제대로 렌더링하도록)
      // 원본 요소에서 체크박스 스타일을 가져와서 복제본에 적용
      const originalCheckboxes = element.querySelectorAll('input[type="checkbox"].acorn-checkbox');
      const clonedCheckboxes = clone.querySelectorAll('input[type="checkbox"].acorn-checkbox');
      
      originalCheckboxes.forEach((originalCheckbox, index) => {
        if (originalCheckbox instanceof HTMLInputElement && clonedCheckboxes[index] instanceof HTMLInputElement) {
          const clonedCheckbox = clonedCheckboxes[index] as HTMLInputElement;
          const computed = window.getComputedStyle(originalCheckbox);
          
          // 체크박스 스타일을 인라인으로 강제 적용
          clonedCheckbox.style.appearance = 'none';
          clonedCheckbox.style.width = computed.width;
          clonedCheckbox.style.height = computed.height;
          clonedCheckbox.style.border = computed.border;
          clonedCheckbox.style.borderRadius = computed.borderRadius;
          clonedCheckbox.style.backgroundColor = computed.backgroundColor;
          clonedCheckbox.style.backgroundImage = computed.backgroundImage;
          clonedCheckbox.style.backgroundRepeat = computed.backgroundRepeat;
          clonedCheckbox.style.backgroundPosition = computed.backgroundPosition;
          clonedCheckbox.style.backgroundSize = computed.backgroundSize;
          clonedCheckbox.style.position = computed.position;
          clonedCheckbox.style.flexShrink = computed.flexShrink;
        }
      });

      document.body.appendChild(clone);

      // 복제본이 DOM에 추가된 후 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 300));

      // 복제본의 실제 크기 재계산
      const cloneWidth = Math.max(clone.scrollWidth, clone.clientWidth, clone.offsetWidth);
      const cloneHeight = Math.max(clone.scrollHeight, clone.clientHeight, clone.offsetHeight);
      
      console.log('   복제본 크기:', cloneWidth, 'x', cloneHeight);
      
      // 복제본 크기가 0이면 원본 크기 사용
      const fullWidth = cloneWidth > 0 ? cloneWidth : Math.max(element.scrollWidth, element.clientWidth, element.offsetWidth);
      const fullHeight = cloneHeight > 0 ? cloneHeight : Math.max(element.scrollHeight, element.clientHeight, element.offsetHeight);

      // 복제본 크기 조정
      if (cloneWidth > 0 && cloneHeight > 0) {
        clone.style.width = `${fullWidth}px`;
        clone.style.height = `${fullHeight}px`;
      }

      console.log('   최종 캡처 크기:', fullWidth, 'x', fullHeight);

      // 스크롤 가능한 모든 하위 요소의 원래 스크롤 위치 저장 및 최상단으로 이동
      const scrollPositions: Array<{ element: HTMLElement; scrollTop: number; scrollLeft: number }> = [];
      const originalScrollableElements = element.querySelectorAll('*');
      
      originalScrollableElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
            scrollPositions.push({
              element: el,
              scrollTop: el.scrollTop,
              scrollLeft: el.scrollLeft,
            });
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        }
      });

      // 요소 자체도 스크롤 가능한 경우 처리
      if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        scrollPositions.push({
          element: element,
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
        });
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }

      // 추가 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 200));

      // html2canvas 옵션 설정
      const canvasOptions = {
        scale: options?.scale || 2, // 고해상도를 위해 기본 2배
        backgroundColor: options?.backgroundColor || '#ffffff',
        useCORS: options?.useCORS !== undefined ? options.useCORS : true,
        logging: options?.logging || false,
        allowTaint: true,
        removeContainer: false,
        imageTimeout: 15000,
        width: fullWidth,
        height: fullHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        foreignObjectRendering: true, // 체크박스 등 복잡한 요소 렌더링 개선
      };

      // 복제본이 제대로 렌더링되었는지 확인
      const cloneRect = clone.getBoundingClientRect();
      console.log('   복제본 위치:', cloneRect.left, cloneRect.top, cloneRect.width, cloneRect.height);
      
      if (cloneRect.width === 0 || cloneRect.height === 0) {
        console.warn('⚠️ 복제본 크기가 0입니다. 원본 요소를 직접 캡처합니다.');
        // 복제본 제거
        document.body.removeChild(clone);
        // 원본 요소 캡처
        const canvas = await html2canvas(element, canvasOptions);
        canvases.push(canvas);
      } else {
        const canvas = await html2canvas(clone, canvasOptions);
        canvases.push(canvas);
        // 복제본 제거
        document.body.removeChild(clone);
      }

      // 스크롤 위치 복원
      scrollPositions.forEach(({ element: el, scrollTop, scrollLeft }) => {
        el.scrollTop = scrollTop;
        el.scrollLeft = scrollLeft;
      });
    }

    // 여러 캔버스를 하나로 합치기
    let finalCanvas: HTMLCanvasElement;
    
    if (canvases.length === 1) {
      finalCanvas = canvases[0];
    } else {
      // 여러 캔버스를 세로로 합치기
      const totalHeight = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
      const maxWidth = Math.max(...canvases.map(canvas => canvas.width));
      
      finalCanvas = document.createElement('canvas');
      finalCanvas.width = maxWidth;
      finalCanvas.height = totalHeight;
      
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다.');
      }
      
      // 배경색 설정
      ctx.fillStyle = options?.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      
      // 각 캔버스를 그리기
      let currentY = 0;
      canvases.forEach((canvas) => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      });
    }

    // Canvas를 Blob으로 변환 (Promise로 감싸기)
    await new Promise<void>((resolve, reject) => {
      finalCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('이미지 생성에 실패했습니다.'));
          return;
        }

        // 파일 다운로드
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ PNG 내보내기 완료:', filename);
        resolve();
      }, 'image/png', 1.0);
    });
  } catch (error: any) {
    console.error('❌ PNG 내보내기 실패:', error);
    throw error;
  }
}

