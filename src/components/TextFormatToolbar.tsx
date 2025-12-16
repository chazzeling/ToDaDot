import { useState, useEffect, useRef, useCallback } from 'react';
import { Bold, Italic, Strikethrough, AlignLeft, AlignCenter, AlignRight, ChevronDown } from 'lucide-react';
import './TextFormatToolbar.css';

interface TextFormatToolbarProps {
  editorRef: React.RefObject<HTMLDivElement>;
}

export default function TextFormatToolbar({ editorRef }: TextFormatToolbarProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [heading, setHeading] = useState<string>('body');
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 포맷팅 상태 업데이트
  const updateFormattingState = () => {
    if (!editorRef.current) {
    setIsBold(false);
    setIsItalic(false);
    setIsStrikethrough(false);
    setHeading('body');
    setTextAlign('left');
    return;
    }

    // queryCommandState를 먼저 시도 (더 정확함)
    let useQueryState = false;
    let queryBold = false;
    let queryItalic = false;
    
    try {
      if (document.queryCommandState && editorRef.current.contains(document.activeElement)) {
        queryBold = document.queryCommandState('bold');
        queryItalic = document.queryCommandState('italic');
        useQueryState = true;
      }
    } catch (e) {
      // queryCommandState가 실패하면 DOM 탐색 방식 사용
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // 선택이 없으면 queryCommandState 결과만 사용
      if (useQueryState) {
        setIsBold(queryBold);
        setIsItalic(queryItalic);
        setIsStrikethrough(false); // strikethrough는 queryCommandState가 없음
        setHeading('body');
        setTextAlign('left');
      } else {
        setIsBold(false);
        setIsItalic(false);
        setIsStrikethrough(false);
        setHeading('body');
        setTextAlign('left');
      }
      return;
    }

    const range = selection.getRangeAt(0);
    
    // 커서 위치나 선택 영역의 실제 노드 확인
    let startNode: Node = range.startContainer;
    let endNode: Node = range.endContainer;
    
    // 텍스트 노드면 부모 요소 사용
    if (startNode.nodeType === Node.TEXT_NODE) {
      startNode = startNode.parentElement || startNode;
    }
    if (endNode.nodeType === Node.TEXT_NODE) {
      endNode = endNode.parentElement || endNode;
    }

    const commonAncestor = range.commonAncestorContainer;
    let node: Node | null = commonAncestor.nodeType === Node.TEXT_NODE
      ? commonAncestor.parentElement
      : commonAncestor as Element;

    // queryCommandState가 있으면 그것을 우선 사용
    let bold = useQueryState ? queryBold : false;
    let italic = useQueryState ? queryItalic : false;
    let strikethrough = false;
    let currentHeading = 'body';
    let currentAlign: 'left' | 'center' | 'right' | 'justify' = 'left';

    // DOM 탐색으로 확인 (queryCommandState가 없거나, strikethrough나 heading 확인)
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        // queryCommandState가 없을 때만 DOM 탐색으로 확인
        if (!useQueryState) {
          if (element.tagName === 'STRONG' || element.tagName === 'B' || 
              window.getComputedStyle(element).fontWeight === 'bold' ||
              parseInt(window.getComputedStyle(element).fontWeight) >= 700) {
            bold = true;
          }
          if (element.tagName === 'EM' || element.tagName === 'I' || 
              window.getComputedStyle(element).fontStyle === 'italic') {
            italic = true;
          }
        }
        
        if (element.tagName === 'DEL' || element.tagName === 'S' ||
            window.getComputedStyle(element).textDecoration.includes('line-through')) {
          strikethrough = true;
        }
        if (element.tagName === 'H1') currentHeading = 'h1';
        else if (element.tagName === 'H2') currentHeading = 'h2';
        else if (element.tagName === 'H3') currentHeading = 'h3';
        else if (element.tagName === 'SMALL' || element.classList.contains('note-text')) currentHeading = 'note';
        else if (element.classList.contains('body-text') && currentHeading === 'body') currentHeading = 'body';
        
        // 텍스트 정렬 확인
        const computedStyle = window.getComputedStyle(element);
        const align = computedStyle.textAlign;
        if (align === 'center') {
          currentAlign = 'center';
        } else if (align === 'right') {
          currentAlign = 'right';
        } else if (align === 'justify') {
          currentAlign = 'justify';
        } else if (align === 'left') {
          currentAlign = 'left';
        }
      }
      node = node.parentElement;
    }

    setIsBold(bold);
    setIsItalic(italic);
    setIsStrikethrough(strikethrough);
    setHeading(currentHeading);
    setTextAlign(currentAlign);
  };

  // 선택 변경 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      updateFormattingState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowHeadingMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const applyFormat = (command: string, value?: string, toggle = true) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    // 현재 상태 확인
    const selection = window.getSelection();
    const isCollapsed = !selection || selection.rangeCount === 0 || selection.isCollapsed;
    
    // 현재 포맷팅 상태 확인
    let currentState = false;
    if (command === 'bold') currentState = isBold;
    else if (command === 'italic') currentState = isItalic;
    else if (command === 'strikethrough') currentState = isStrikethrough;

    // 토글: 이미 적용된 경우 해제
    if (toggle && currentState) {
      // 해제
      document.execCommand(command, false, 'false');
      // DOM 업데이트 후 상태 확인
      setTimeout(() => {
        updateFormattingState();
      }, 0);
    } else {
      // 적용
      document.execCommand(command, false, value || '');
      // DOM 업데이트 후 상태 확인
      setTimeout(() => {
        updateFormattingState();
      }, 0);
    }

    // onChange 이벤트 트리거
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
    
    // 입력 후 포맷팅 상태 업데이트를 위한 추가 지연 (타입 입력 시 버튼 활성화 상태 동기화)
    setTimeout(() => {
      updateFormattingState();
    }, 10);
  };

  const handleBold = () => {
    applyFormat('bold');
  };

  const handleItalic = () => {
    applyFormat('italic');
  };

  const handleStrikethrough = () => {
    applyFormat('strikethrough');
  };

  const handleAlignLeft = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('justifyLeft', false);
    setTextAlign('left');
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
    setTimeout(() => {
      updateFormattingState();
    }, 10);
  };

  const handleAlignCenter = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('justifyCenter', false);
    setTextAlign('center');
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
    setTimeout(() => {
      updateFormattingState();
    }, 10);
  };

  const handleAlignRight = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('justifyRight', false);
    setTextAlign('right');
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
    setTimeout(() => {
      updateFormattingState();
    }, 10);
  };

  const handleHeading = (headingType: string) => {
    if (!editorRef.current) return;

    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // 현재 선택된 텍스트 가져오기
    const selectedText = range.toString();

    // 기존 포맷 제거
    document.execCommand('removeFormat', false);

    // 새 포맷 적용
    let tagName = 'p';
    let className = '';
    
    if (headingType === 'h1') tagName = 'h1';
    else if (headingType === 'h2') tagName = 'h2';
    else if (headingType === 'h3') tagName = 'h3';
    else if (headingType === 'body') {
      tagName = 'p';
      className = 'body-text';
    }
    else if (headingType === 'note') {
      tagName = 'small';
      className = 'note-text';
    }

    // 선택된 텍스트가 있으면 해당 텍스트를 감싸는 태그 생성
    if (selectedText) {
      // 선택 영역의 모든 내용을 가져와서 새 태그로 감싸기
      const contents = range.extractContents();
      
      // 본문이나 주석으로 변경할 때는 모든 포맷 태그 제거 (볼드, 이탤릭, 취소선 등)
      if (headingType === 'body' || headingType === 'note') {
        // DOM 요소를 순회하면서 포맷 태그 제거
        const removeFormatTags = (node: Node): Node => {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.cloneNode(true);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            const tagName = element.tagName.toLowerCase();
            
            // 포맷 태그들 제거 (strong, b, em, i, del, s, u 등)
            if (['strong', 'b', 'em', 'i', 'del', 's', 'u', 'strike'].includes(tagName)) {
              // 포맷 태그 안의 텍스트만 추출
              const textNode = document.createTextNode(element.textContent || '');
              return textNode;
            } else {
              // 일반 요소는 유지하되 내부 요소 재귀적으로 처리
              const cloned = element.cloneNode(false) as HTMLElement;
              for (let i = 0; i < element.childNodes.length; i++) {
                const processed = removeFormatTags(element.childNodes[i]);
                cloned.appendChild(processed);
              }
              return cloned;
            }
          }
          return node.cloneNode(true);
        };
        
        // 모든 자식 노드를 처리
        const processedFragment = document.createDocumentFragment();
        for (let i = 0; i < contents.childNodes.length; i++) {
          const processed = removeFormatTags(contents.childNodes[i]);
          processedFragment.appendChild(processed);
        }
        
        const element = document.createElement(tagName);
        if (className) element.className = className;
        
        // 처리된 내용을 새 요소에 추가
        while (processedFragment.firstChild) {
          element.appendChild(processedFragment.firstChild);
        }
        
        // 빈 요소가 아닌 경우에만 삽입
        if (element.textContent && element.textContent.trim()) {
          range.insertNode(element);
          
          // 선택 영역을 새 요소로 설정
          const newRange = document.createRange();
          newRange.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } else {
        // 제목 스타일로 변경할 때는 기존 방식 유지
        const element = document.createElement(tagName);
        if (className) element.className = className;
        
        // 추출된 내용의 모든 자식 노드를 새 요소에 이동
        while (contents.firstChild) {
          element.appendChild(contents.firstChild);
        }
        
        // 빈 요소가 아닌 경우에만 삽입
        if (element.textContent && element.textContent.trim()) {
          range.insertNode(element);
          
          // 선택 영역을 새 요소로 설정
          const newRange = document.createRange();
          newRange.selectNodeContents(element);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      }
    } else {
      // 선택된 텍스트가 없으면 다음 입력에 적용
      // formatBlock을 사용
      if (headingType === 'h1') document.execCommand('formatBlock', false, '<h1>');
      else if (headingType === 'h2') document.execCommand('formatBlock', false, '<h2>');
      else if (headingType === 'h3') document.execCommand('formatBlock', false, '<h3>');
      else if (headingType === 'body') {
        document.execCommand('formatBlock', false, '<p>');
        // 본문으로 변경할 때 모든 포맷 제거
        document.execCommand('removeFormat', false);
        // body-text 클래스 추가
        const currentBlock = selection.anchorNode?.parentElement;
        if (currentBlock && (currentBlock.tagName === 'P' || currentBlock.tagName === 'DIV')) {
          currentBlock.className = 'body-text';
        }
      }
      else if (headingType === 'note') {
        document.execCommand('formatBlock', false, '<p>');
        // 주석으로 변경할 때 모든 포맷 제거
        document.execCommand('removeFormat', false);
        // note-text 클래스 추가
        const currentBlock = selection.anchorNode?.parentElement;
        if (currentBlock && (currentBlock.tagName === 'P' || currentBlock.tagName === 'DIV')) {
          currentBlock.className = 'note-text';
        }
      }
    }

    setHeading(headingType);
    setShowHeadingMenu(false);

    // onChange 이벤트 트리거
    const event = new Event('input', { bubbles: true });
    editorRef.current.dispatchEvent(event);
  };

  const headingLabels: Record<string, string> = {
    h1: '제목1',
    h2: '제목2',
    h3: '제목3',
    body: '본문',
    note: '주석',
  };

  return (
    <div className="text-format-toolbar">
      <button
        type="button"
        onClick={handleBold}
        className={`format-btn ${isBold ? 'active' : ''}`}
        title="볼드 (Ctrl+B)"
      >
        <Bold size={16} color="var(--text-primary)" />
      </button>
      <button
        type="button"
        onClick={handleItalic}
        className={`format-btn ${isItalic ? 'active' : ''}`}
        title="이탤릭 (Ctrl+I)"
      >
        <Italic size={16} color="var(--text-primary)" />
      </button>
      <button
        type="button"
        onClick={handleStrikethrough}
        className={`format-btn ${isStrikethrough ? 'active' : ''}`}
        title="취소선"
      >
        <Strikethrough size={16} color="var(--text-primary)" />
      </button>
      <div className="heading-dropdown" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className="format-btn heading-btn"
          title="텍스트 스타일"
        >
          <span>{headingLabels[heading] || '본문'}</span>
          <ChevronDown size={16} color="var(--text-primary)" />
        </button>
        {showHeadingMenu && (
          <div className="heading-menu">
            <button
              type="button"
              onClick={() => handleHeading('h1')}
              className={`heading-menu-item ${heading === 'h1' ? 'active' : ''}`}
            >
              제목1
            </button>
            <button
              type="button"
              onClick={() => handleHeading('h2')}
              className={`heading-menu-item ${heading === 'h2' ? 'active' : ''}`}
            >
              제목2
            </button>
            <button
              type="button"
              onClick={() => handleHeading('h3')}
              className={`heading-menu-item ${heading === 'h3' ? 'active' : ''}`}
            >
              제목3
            </button>
            <button
              type="button"
              onClick={() => handleHeading('body')}
              className={`heading-menu-item ${heading === 'body' ? 'active' : ''}`}
            >
              본문
            </button>
            <button
              type="button"
              onClick={() => handleHeading('note')}
              className={`heading-menu-item ${heading === 'note' ? 'active' : ''}`}
            >
              주석
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleAlignLeft}
        className={`format-btn ${textAlign === 'left' ? 'active' : ''}`}
        title="왼쪽 정렬"
      >
        <AlignLeft size={16} color="var(--text-primary)" />
      </button>
      <button
        type="button"
        onClick={handleAlignCenter}
        className={`format-btn ${textAlign === 'center' ? 'active' : ''}`}
        title="가운데 정렬"
      >
        <AlignCenter size={16} color="var(--text-primary)" />
      </button>
      <button
        type="button"
        onClick={handleAlignRight}
        className={`format-btn ${textAlign === 'right' ? 'active' : ''}`}
        title="오른쪽 정렬"
      >
        <AlignRight size={16} color="var(--text-primary)" />
      </button>
    </div>
  );
}
