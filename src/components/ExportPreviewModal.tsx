import { useState, useRef, useEffect } from 'react';
import { FileUp, X, Download } from 'lucide-react';
import './ExportPreviewModal.css';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyFocusContent?: HTMLElement | null;
  diaryContent?: HTMLElement | null;
  onExport: (type: 'daily-focus' | 'diary' | 'both', format: 'pdf' | 'png') => void;
}

export default function ExportPreviewModal({
  isOpen,
  onClose,
  dailyFocusContent,
  diaryContent,
  onExport,
}: ExportPreviewModalProps) {
  const [exportType, setExportType] = useState<'daily-focus' | 'diary' | 'both'>('both');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png'>('pdf');
  const previewRef = useRef<HTMLDivElement>(null);

  // 전역 CSS 변수와 스타일을 복사하는 함수
  const copyGlobalStyles = (container: HTMLElement) => {
    const styleSheets = Array.from(document.styleSheets);
    const addedStyles = new Set<string>(); // 중복 방지
    
    // :root 스타일을 먼저 추가 (CSS 변수 정의)
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
            const styleKey = `:root-${rule.cssText}`;
            if (!addedStyles.has(styleKey)) {
              const styleElement = document.createElement('style');
              styleElement.textContent = rule.cssText;
              container.insertBefore(styleElement, container.firstChild);
              addedStyles.add(styleKey);
            }
          } else if (rule instanceof CSSKeyframesRule) {
            // 애니메이션 키프레임도 복사
            const styleKey = `@keyframes-${rule.name}`;
            if (!addedStyles.has(styleKey)) {
              const styleElement = document.createElement('style');
              styleElement.textContent = rule.cssText;
              container.insertBefore(styleElement, container.firstChild);
              addedStyles.add(styleKey);
            }
          }
        });
      } catch (e) {
        // CORS 문제로 접근 불가한 스타일시트는 무시
      }
    });
    
    // 일반 CSS 규칙 추가
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach(rule => {
          if (rule instanceof CSSStyleRule && rule.selectorText !== ':root') {
            const styleKey = `${rule.selectorText}-${rule.cssText.substring(0, 100)}`;
            if (!addedStyles.has(styleKey)) {
              const styleElement = document.createElement('style');
              styleElement.textContent = rule.cssText;
              container.appendChild(styleElement);
              addedStyles.add(styleKey);
            }
          }
        });
      } catch (e) {
        // CORS 문제로 접근 불가한 스타일시트는 무시
      }
    });
  };

  // 숨겨진 요소를 강제로 표시하는 함수
  const forceShowHiddenElements = (element: HTMLElement) => {
    // 루트 요소부터 시작
    const processElement = (el: HTMLElement) => {
      const computed = window.getComputedStyle(el);
      
      // display: none인 경우 block으로 변경
      if (computed.display === 'none') {
        el.style.setProperty('display', 'block', 'important');
      }
      
      // visibility: hidden인 경우 visible로 변경
      if (computed.visibility === 'hidden') {
        el.style.setProperty('visibility', 'visible', 'important');
      }
      
      // opacity가 0인 경우 1로 변경
      if (computed.opacity === '0') {
        el.style.setProperty('opacity', '1', 'important');
      }
      
      // height나 width가 0인 경우 처리
      const height = computed.height;
      const width = computed.width;
      
      if (height === '0px' || height === '0') {
        // 원래 높이가 필요한 경우에만 auto로 설정
        if (el.scrollHeight > 0) {
          el.style.setProperty('height', `${el.scrollHeight}px`, 'important');
        } else {
          el.style.setProperty('height', 'auto', 'important');
        }
      }
      
      if (width === '0px' || width === '0') {
        // 원래 너비가 필요한 경우에만 auto로 설정
        if (el.scrollWidth > 0) {
          el.style.setProperty('width', `${el.scrollWidth}px`, 'important');
        } else {
          el.style.setProperty('width', 'auto', 'important');
        }
      }
      
      // 모든 자식 요소도 재귀적으로 처리
      Array.from(el.children).forEach(child => {
        if (child instanceof HTMLElement) {
          processElement(child);
        }
      });
    };
    
    processElement(element);
  };

  useEffect(() => {
    if (!isOpen || !previewRef.current) return;

    // 기존 내용 제거
    previewRef.current.innerHTML = '';

    // 전역 스타일 복사 (CSS 변수 포함)
    copyGlobalStyles(previewRef.current);

    // 선택된 타입에 따라 콘텐츠 추가
    if (exportType === 'daily-focus' || exportType === 'both') {
      // ID로 정확하게 데일리 포커스 뷰 찾기
      let dailyFocusElement = document.querySelector('#daily-focus-view') as HTMLElement;
      
      // ID를 찾지 못한 경우, 숨겨진 요소에서도 찾기 (visibility: hidden인 요소 포함)
      if (!dailyFocusElement) {
        // 모든 #daily-focus-view 요소 찾기 (숨겨진 것 포함)
        const allDailyFocus = document.querySelectorAll('#daily-focus-view');
        if (allDailyFocus.length > 0) {
          dailyFocusElement = allDailyFocus[0] as HTMLElement;
        }
      }
      
      if (!dailyFocusElement) {
        // 레이아웃 전체 찾기 (fallback)
        const layouts = document.querySelectorAll('.app-layout.daily-focus-mode');
        if (layouts.length > 0) {
          // 첫 번째 레이아웃에서 DailyFocusTab 찾기
          for (let layout of layouts) {
            const tab = (layout as HTMLElement).querySelector('#daily-focus-view') || 
                        (layout as HTMLElement).querySelector('.daily-focus-tab');
            if (tab) {
              dailyFocusElement = tab as HTMLElement;
              break;
            }
          }
          // 레이아웃 전체를 사용
          if (!dailyFocusElement && layouts.length > 0) {
            dailyFocusElement = layouts[0] as HTMLElement;
          }
        }
      }
      
      if (!dailyFocusElement) {
        // 클래스명으로 찾기 (fallback)
        const tabs = document.querySelectorAll('.daily-focus-tab');
        if (tabs.length > 0) {
          dailyFocusElement = tabs[0] as HTMLElement;
        }
      }
      
      if (dailyFocusElement) {
        // Daily Focus 탭만 찾은 경우, 시간 계획/기록 패널도 함께 포함하기 위해 부모 레이아웃 찾기
        let layoutElement = dailyFocusElement.closest('.app-layout.daily-focus-mode') as HTMLElement;
        
        // 레이아웃을 찾은 경우 전체를 복사, 아니면 탭만 복사
        const elementToClone = layoutElement || dailyFocusElement;
        const clone = elementToClone.cloneNode(true) as HTMLElement;
        
        // 스타일 복사
        const computedStyle = window.getComputedStyle(elementToClone);
        clone.style.cssText = computedStyle.cssText;
        clone.className = elementToClone.className;
        
        // 숨겨진 요소 강제 표시
        forceShowHiddenElements(clone);
        
        // 모든 스타일시트를 클론에 추가 (CSS 변수 포함)
        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach(rule => {
              const styleElement = document.createElement('style');
              styleElement.textContent = rule.cssText;
              clone.appendChild(styleElement);
            });
          } catch (e) {
            // CORS 문제로 접근 불가한 스타일시트는 무시
          }
        });
        
        // 내부 스타일도 복사
        const allElements = elementToClone.querySelectorAll('*');
        const clonedElements = clone.querySelectorAll('*');
        allElements.forEach((el, index) => {
          const computed = window.getComputedStyle(el);
          const cloned = clonedElements[index];
          if (cloned) {
            // 모든 computed style 속성 복사
            const style = (cloned as HTMLElement).style;
            
            // 배경색 및 색상 복사
            if (el instanceof HTMLElement) {
              const bgColor = computed.backgroundColor;
              const color = computed.color;
              const borderColor = computed.borderColor;
              
              if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'rgba(255, 255, 255, 0)') {
                style.backgroundColor = bgColor;
              }
              
              if (color && color !== 'rgba(0, 0, 0, 0)') {
                style.color = color;
              }
              
              if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
                style.borderColor = borderColor;
              }
              
              // width, height 등 레이아웃 속성도 복사
              if (computed.width && computed.width !== 'auto') {
                style.width = computed.width;
              }
              if (computed.height && computed.height !== 'auto') {
                style.height = computed.height;
              }
              
              // padding, margin 복사
              style.padding = computed.padding;
              style.margin = computed.margin;
              
              // 인라인 스타일도 복사
              if (el.style.cssText) {
                style.cssText += '; ' + el.style.cssText;
              }
            }
            
            // SVG와 같은 특수 요소 처리
            if (el instanceof SVGElement) {
              const svgComputed = window.getComputedStyle(el);
              (cloned as SVGElement).style.cssText = svgComputed.cssText;
              
              // SVG 요소의 fill, stroke 등 속성도 복사
              if (el.hasAttribute('fill')) {
                (cloned as SVGElement).setAttribute('fill', el.getAttribute('fill') || '');
              }
              if (el.hasAttribute('stroke')) {
                (cloned as SVGElement).setAttribute('stroke', el.getAttribute('stroke') || '');
              }
              
              // SVG path, circle 등 내부 요소도 처리
              const svgChildren = el.children;
              const clonedSvgChildren = cloned.children;
              for (let i = 0; i < svgChildren.length; i++) {
                const svgChild = svgChildren[i] as SVGElement;
                const clonedSvgChild = clonedSvgChildren[i] as SVGElement;
                if (svgChild && clonedSvgChild) {
                  // SVG 자식 요소의 속성도 복사
                  Array.from(svgChild.attributes).forEach(attr => {
                    clonedSvgChild.setAttribute(attr.name, attr.value);
                  });
                }
              }
            }
          }
        });
        
        previewRef.current.appendChild(clone);
      } else {
        console.warn('Daily Focus 요소를 찾을 수 없습니다.');
        // daily-focus만 선택했는데 요소를 찾지 못한 경우 경고 표시
        if (exportType === 'daily-focus') {
          const warningDiv = document.createElement('div');
          warningDiv.style.padding = '20px';
          warningDiv.style.textAlign = 'center';
          warningDiv.style.color = 'var(--text-primary)';
          warningDiv.textContent = 'Daily Focus 뷰를 찾을 수 없습니다. Daily Focus 탭이 활성화되어 있는지 확인해주세요.';
          previewRef.current.appendChild(warningDiv);
          return; // diary 블록 실행 방지
        }
      }
    }

    if (exportType === 'diary' || exportType === 'both') {
      // daily-focus만 선택했을 때는 diary를 추가하지 않음 (이미 위에서 처리됨)
      if (exportType === 'daily-focus') {
        return;
      }
      
      // ID로 정확하게 다이어리 뷰 찾기 (숨겨진 요소 포함)
      let diaryElement = document.querySelector('#diary-view') as HTMLElement;
      
      // ID를 찾지 못한 경우, 숨겨진 요소에서도 찾기
      if (!diaryElement) {
        // 모든 #diary-view 요소 찾기 (visibility: hidden인 요소 포함)
        const allDiary = document.querySelectorAll('#diary-view');
        if (allDiary.length > 0) {
          diaryElement = allDiary[0] as HTMLElement;
        }
      }
      
      if (!diaryElement) {
        // 클래스명으로 찾기 (fallback)
        const diaryTabs = document.querySelectorAll('.diary-tab');
        if (diaryTabs.length > 0) {
          diaryElement = diaryTabs[0] as HTMLElement;
        }
      }
      
      if (diaryElement) {
        const clone = diaryElement.cloneNode(true) as HTMLElement;
        // 스타일 복사
        const computedStyle = window.getComputedStyle(diaryElement);
        clone.style.cssText = computedStyle.cssText;
        // 클래스명 복사
        clone.className = diaryElement.className;
        
        // 숨겨진 요소 강제 표시
        forceShowHiddenElements(clone);
        
        // 모든 스타일시트를 클론에 추가 (CSS 변수 포함)
        const styleSheets = Array.from(document.styleSheets);
        styleSheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach(rule => {
              const styleElement = document.createElement('style');
              styleElement.textContent = rule.cssText;
              clone.appendChild(styleElement);
            });
          } catch (e) {
            // CORS 문제로 접근 불가한 스타일시트는 무시
          }
        });
        
        // 내부 스타일도 복사
        const allElements = diaryElement.querySelectorAll('*');
        const clonedElements = clone.querySelectorAll('*');
        allElements.forEach((el, index) => {
          const computed = window.getComputedStyle(el);
          const cloned = clonedElements[index];
          if (cloned) {
            // 모든 computed style 속성 복사
            const style = (cloned as HTMLElement).style;
            
            // 배경색 및 색상 복사
            if (el instanceof HTMLElement) {
              const bgColor = computed.backgroundColor;
              const color = computed.color;
              const borderColor = computed.borderColor;
              
              if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'rgba(255, 255, 255, 0)') {
                style.backgroundColor = bgColor;
              }
              
              if (color && color !== 'rgba(0, 0, 0, 0)') {
                style.color = color;
              }
              
              if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
                style.borderColor = borderColor;
              }
              
              // width, height 등 레이아웃 속성도 복사
              if (computed.width && computed.width !== 'auto') {
                style.width = computed.width;
              }
              if (computed.height && computed.height !== 'auto') {
                style.height = computed.height;
              }
              
              // padding, margin 복사
              style.padding = computed.padding;
              style.margin = computed.margin;
              
              // 인라인 스타일도 복사
              if (el.style.cssText) {
                style.cssText += '; ' + el.style.cssText;
              }
            }
            
            // SVG와 같은 특수 요소 처리
            if (el instanceof SVGElement) {
              const svgComputed = window.getComputedStyle(el);
              (cloned as SVGElement).style.cssText = svgComputed.cssText;
              
              // SVG 요소의 fill, stroke 등 속성도 복사
              if (el.hasAttribute('fill')) {
                (cloned as SVGElement).setAttribute('fill', el.getAttribute('fill') || '');
              }
              if (el.hasAttribute('stroke')) {
                (cloned as SVGElement).setAttribute('stroke', el.getAttribute('stroke') || '');
              }
              
              // SVG path, circle 등 내부 요소도 처리
              const svgChildren = el.children;
              const clonedSvgChildren = cloned.children;
              for (let i = 0; i < svgChildren.length; i++) {
                const svgChild = svgChildren[i] as SVGElement;
                const clonedSvgChild = clonedSvgChildren[i] as SVGElement;
                if (svgChild && clonedSvgChild) {
                  // SVG 자식 요소의 속성도 복사
                  Array.from(svgChild.attributes).forEach(attr => {
                    clonedSvgChild.setAttribute(attr.name, attr.value);
                  });
                }
              }
            }
          }
        });
        previewRef.current.appendChild(clone);
      } else {
        console.warn('Diary 요소를 찾을 수 없습니다.');
        // Diary만 선택했거나 둘 다 선택했는데 Diary 요소를 찾지 못한 경우 경고 메시지 표시
        if (exportType === 'diary' || exportType === 'both') {
          const warningDiv = document.createElement('div');
          warningDiv.style.padding = '20px';
          warningDiv.style.textAlign = 'center';
          warningDiv.style.color = 'var(--text-primary)';
          warningDiv.style.marginTop = exportType === 'both' ? '20px' : '0';
          warningDiv.textContent = exportType === 'both' 
            ? 'Diary 뷰를 찾을 수 없습니다. Daily Focus 탭에서 Diary 서브탭이 활성화되어 있는지 확인해주세요.'
            : 'Diary 뷰를 찾을 수 없습니다. Daily Focus 탭에서 Diary 서브탭이 활성화되어 있는지 확인해주세요.';
          previewRef.current.appendChild(warningDiv);
        }
      }
    }
  }, [isOpen, exportType]);

  if (!isOpen) return null;

  return (
    <div className="export-preview-overlay" onClick={onClose}>
      <div className="export-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="export-preview-header">
          <h2>내보내기 미리보기</h2>
          <button className="export-preview-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-preview-options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label>
                <input
                  type="radio"
                  value="daily-focus"
                  checked={exportType === 'daily-focus'}
                  onChange={(e) => setExportType(e.target.value as 'daily-focus')}
                />
                <span>데일리 포커스 뷰만</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="diary"
                  checked={exportType === 'diary'}
                  onChange={(e) => setExportType(e.target.value as 'diary')}
                />
                <span>다이어리만</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="both"
                  checked={exportType === 'both'}
                  onChange={(e) => setExportType(e.target.value as 'both')}
                />
                <span>둘 다</span>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '16px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <label>
                <input
                  type="radio"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                />
                <span>PDF</span>
              </label>
              <label>
                <input
                  type="radio"
                  value="png"
                  checked={exportFormat === 'png'}
                  onChange={(e) => setExportFormat(e.target.value as 'png')}
                />
                <span>PNG</span>
              </label>
            </div>
          </div>
        </div>

        <div className="export-preview-content" ref={previewRef}></div>

        <div className="export-preview-footer">
          <button className="export-preview-cancel" onClick={onClose}>
            취소
          </button>
          <button
            className="export-preview-export"
            onClick={() => {
              onExport(exportType, exportFormat);
              onClose();
            }}
          >
            <Download size={16} />
            {exportFormat === 'pdf' ? 'PDF로 내보내기' : 'PNG로 내보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}

