import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string; // HTML 문자열
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  autoFocus?: boolean;
  onSelectionChange?: (formatting: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    heading: string;
  }) => void;
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(({
  value,
  onChange,
  placeholder,
  className = '',
  rows = 4,
  onKeyDown,
  autoFocus,
  onSelectionChange,
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);
  const [isFocused, setIsFocused] = useState(false);

  // 포맷팅 상태 확인
  const checkFormatting = useCallback(() => {
    if (!editorRef.current || !onSelectionChange) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;

    // 부모 요소들에서 포맷팅 확인
    let node: Node | null = commonAncestor.nodeType === Node.TEXT_NODE
      ? commonAncestor.parentElement
      : commonAncestor as Element;

    let bold = false;
    let italic = false;
    let strikethrough = false;
    let heading = 'body';

    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        
        if (element.tagName === 'STRONG' || element.tagName === 'B' || 
            window.getComputedStyle(element).fontWeight === 'bold' ||
            parseInt(window.getComputedStyle(element).fontWeight) >= 700) {
          bold = true;
        }
        if (element.tagName === 'EM' || element.tagName === 'I' || 
            window.getComputedStyle(element).fontStyle === 'italic') {
          italic = true;
        }
        if (element.tagName === 'DEL' || element.tagName === 'S' ||
            window.getComputedStyle(element).textDecoration.includes('line-through')) {
          strikethrough = true;
        }
        if (element.tagName === 'H1') heading = 'h1';
        else if (element.tagName === 'H2') heading = 'h2';
        else if (element.tagName === 'H3') heading = 'h3';
        else if (element.tagName === 'SMALL') heading = 'note';
        else if (element.classList.contains('body-text')) heading = 'body';
      }
      node = node.parentElement;
    }

    onSelectionChange({ bold, italic, strikethrough, heading });
  }, [onSelectionChange]);

  // 에디터 내용 업데이트
  useEffect(() => {
    if (!editorRef.current) return;
    
    // 현재 포커스된 경우에만 업데이트 (무한 루프 방지)
    if (document.activeElement !== editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      if (currentHtml !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // 선택 변경 감지
  useEffect(() => {
    const handleSelectionChange = () => {
      checkFormatting();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [checkFormatting]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    const text = e.currentTarget.innerText;
    onChange(html, text);
    
    // 입력 후 포맷팅 상태 업데이트 (버튼 활성화 상태 동기화)
    setTimeout(() => {
      checkFormatting();
    }, 0);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  // 포맷팅 적용 함수들
  const applyFormat = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    document.execCommand(command, false, value || '');
    checkFormatting();
    
    // onChange 트리거
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText;
    onChange(html, text);
  }, [onChange, checkFormatting]);

  // 외부에서 포맷팅 적용할 수 있도록 ref 노출
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).applyFormat = applyFormat;
    }
  }, [applyFormat]);

  return (
    <div
      ref={editorRef}
      contentEditable
      className={`rich-text-editor ${className} ${isFocused ? 'focused' : ''}`}
      onInput={handleInput}
      onPaste={handlePaste}
      onKeyDown={onKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{
        minHeight: `${rows * 1.5}em`,
      }}
    />
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

