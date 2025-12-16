// PDF 내보내기 유틸리티 함수 - Electron printToPDF API 사용

interface ExportOptions {
  pageSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Ledger';
  landscape?: boolean;
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

// HTML 요소의 스타일과 콘텐츠를 추출하여 완전한 HTML 문서로 변환
function elementToHTML(element: HTMLElement): string {
  // 요소의 모든 스타일시트 수집
  const styles: string[] = [];
  
  // 모든 스타일시트 가져오기
  try {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule) => {
          styles.push(rule.cssText);
        });
      } catch (e) {
        // CORS 문제 등으로 접근할 수 없는 스타일시트는 무시
        console.warn('Cannot access stylesheet:', e);
      }
    });
  } catch (error) {
    console.warn('Failed to collect stylesheets:', error);
  }

  // 인라인 스타일도 수집
  const inlineStyles: string[] = [];
  const collectInlineStyles = (el: HTMLElement) => {
    if (el.style && el.style.cssText) {
      inlineStyles.push(`#${el.id || 'exported-element'} { ${el.style.cssText} }`);
    }
    Array.from(el.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        collectInlineStyles(child);
      }
    });
  };
  collectInlineStyles(element);

  // 요소의 HTML 콘텐츠 가져오기
  const elementHTML = element.outerHTML;

  // 완전한 HTML 문서 생성
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ToDaDot Export</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: white;
    }
    ${styles.join('\n')}
    ${inlineStyles.join('\n')}
  </style>
</head>
<body>
  ${elementHTML}
</body>
</html>
  `.trim();

  return html;
}

// 여러 HTML 요소를 하나의 HTML 문서로 합치기
function elementsToHTML(elements: HTMLElement[]): string {
  const htmlParts: string[] = [];
  
  // 모든 스타일시트 수집
  const styles: string[] = [];
  try {
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        rules.forEach((rule) => {
          styles.push(rule.cssText);
        });
      } catch (e) {
        console.warn('Cannot access stylesheet:', e);
      }
    });
  } catch (error) {
    console.warn('Failed to collect stylesheets:', error);
  }

  // 각 요소를 HTML로 변환 (computed style을 인라인 스타일로 적용)
  elements.forEach((element, index) => {
    if (element) {
      // 요소를 클론하여 스타일 적용
      const clone = element.cloneNode(true) as HTMLElement;
      const tempId = `exported-element-${index}`;
      clone.setAttribute('data-export-id', tempId);
      
      // 모든 하위 요소에 computed style을 인라인 스타일로 적용
      const applyComputedStyles = (original: HTMLElement, cloned: HTMLElement) => {
        const computed = window.getComputedStyle(original);
        
        // 색상 관련 속성들을 인라인 스타일로 적용
        const colorProps = [
          'color',
          'backgroundColor',
          'borderColor',
          'borderTopColor',
          'borderRightColor',
          'borderBottomColor',
          'borderLeftColor',
          'outlineColor',
        ];
        
        colorProps.forEach(prop => {
          const value = computed.getPropertyValue(prop);
          if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent' && value.trim() !== '') {
            cloned.style.setProperty(prop, value);
          }
        });
        
        // 배경색이 투명하지 않은 경우 명시적으로 설정 (중요!)
        const bgColor = computed.backgroundColor;
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgColor !== 'initial' && bgColor !== 'inherit') {
          cloned.style.backgroundColor = bgColor;
          cloned.style.setProperty('-webkit-print-color-adjust', 'exact');
          cloned.style.setProperty('print-color-adjust', 'exact');
        }
        
        // 텍스트 색상도 명시적으로 설정
        const textColor = computed.color;
        if (textColor && textColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'transparent' && textColor !== 'initial' && textColor !== 'inherit') {
          cloned.style.color = textColor;
        }
        
        // 테두리 색상도 명시적으로 설정
        const borderColor = computed.borderColor;
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)' && borderColor !== 'transparent' && borderColor !== 'initial' && borderColor !== 'inherit') {
          cloned.style.borderColor = borderColor;
        }
        
        // 자식 요소들도 재귀적으로 처리
        const originalChildren = Array.from(original.children) as HTMLElement[];
        const clonedChildren = Array.from(cloned.children) as HTMLElement[];
        originalChildren.forEach((origChild, i) => {
          if (origChild instanceof HTMLElement && clonedChildren[i] instanceof HTMLElement) {
            applyComputedStyles(origChild, clonedChildren[i]);
          }
        });
      };
      
      applyComputedStyles(element, clone);
      
      htmlParts.push(clone.outerHTML);
      
      // 페이지 브레이크 추가 (마지막 요소 제외)
      if (index < elements.length - 1) {
        htmlParts.push('<div style="page-break-after: always;"></div>');
                }
              }
            });
            
  // 현재 적용된 CSS 변수 값 수집
  const cssVariables: string[] = [];
  const rootStyle = getComputedStyle(document.documentElement);
  const cssVarNames = [
    '--color-background',
    '--color-surface',
    '--main-color',
    '--sub-color',
    '--accent-color',
    '--line-color',
    '--text-primary',
    '--text-secondary',
    '--background-color',
    '--bg-primary',
    '--bg-secondary',
    '--border-color',
    '--hover-bg',
    '--selected-bg',
    '--color-danger',
    '--color-danger-light',
  ];
  
  cssVarNames.forEach(varName => {
    const value = rootStyle.getPropertyValue(varName).trim();
    if (value) {
      cssVariables.push(`    ${varName}: ${value};`);
    }
  });

  // 완전한 HTML 문서 생성
  const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ToDaDot Export</title>
  <style>
    :root {
${cssVariables.join('\n')}
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: white;
      overflow: visible;
    }
    @media print {
      html, body {
        padding: 0;
        margin: 0;
        width: 100%;
        height: auto;
      }
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    ${styles.join('\n')}
  </style>
</head>
<body>
  ${htmlParts.join('\n')}
</body>
</html>
  `.trim();

  return html;
}

// Electron API를 사용하여 PDF 내보내기
export async function exportToPDF(
  elements: HTMLElement[],
  filename: string = 'export.pdf',
  options?: ExportOptions
): Promise<void> {
  try {
    // Electron API 확인 (웹 환경에서는 어댑터 사용)
    const { getElectronAPI, isElectron } = await import('./webAdapter');
    const electronAPI = getElectronAPI();
    
    if (!electronAPI) {
      throw new Error('PDF export API is not available.');
    }
    
    // 웹 환경에서는 html2canvas + jsPDF 사용
    if (!isElectron()) {
      console.log('🌐 Web environment: Using html2canvas + jsPDF for PDF export');
      // 웹 환경에서는 html2canvas + jsPDF로 직접 처리
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // 요소들을 하나씩 캡처하여 PDF에 추가
      const pdf = new jsPDF({
        orientation: options?.landscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: options?.pageSize || 'a4',
      });
      
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (!element) continue;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      
      // 파일 다운로드
      pdf.save(filename);
      console.log('✅ PDF exported successfully (web):', filename);
      return;
    }

    // 요소들을 하나의 HTML 문서로 변환
    const htmlContent = elementsToHTML(elements);

    console.log('📄 Generating PDF from HTML content...');
    console.log('📏 HTML content length:', htmlContent.length);

    // Electron printToPDF API 호출
    console.log('📤 PDF 생성 요청 전송 중...');
    console.log('📏 HTML 콘텐츠 길이:', htmlContent.length);
    
    const result = await electronAPI.printToPDF(htmlContent, {
      pageSize: options?.pageSize || 'A4',
      landscape: options?.landscape !== undefined ? options.landscape : true, // 기본값을 가로로 변경
      margins: options?.margins || {
        top: 0.2,    // 0.2 인치 (약 5mm) - 최소 여백
        right: 0.2,
        bottom: 0.2,
        left: 0.2,
      },
    });

    console.log('📥 PDF 생성 응답 받음:', result);

    if (!result.success) {
      const errorMessage = result.error || 'PDF generation failed';
      console.error('❌ PDF 생성 실패:', errorMessage);
      throw new Error(errorMessage);
    }
    
    if (!result.data) {
      console.error('❌ PDF 데이터가 없음');
      throw new Error('PDF data is missing');
    }

    // Base64 데이터를 Blob으로 변환
    const pdfData = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
    const blob = new Blob([pdfData], { type: 'application/pdf' });

    // 파일 다운로드
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✅ PDF exported successfully:', filename);
  } catch (error: any) {
    console.error('❌ PDF 내보내기 실패:', error);
    throw error;
  }
}
