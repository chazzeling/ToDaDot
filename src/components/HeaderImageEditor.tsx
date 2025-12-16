import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './HeaderImageEditor.css';

interface HeaderImageEditorProps {
  onClose: () => void;
  onSave: (imagePath: string) => void;
  initialImageSrc?: string | null;
}

export default function HeaderImageEditor({ onClose, onSave, initialImageSrc }: HeaderImageEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialImageSrc || null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(16 / 3); // 배너 비율 (너비:높이)
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // initialImageSrc가 변경되면 업데이트
  useEffect(() => {
    if (initialImageSrc) {
      setImageSrc(initialImageSrc);
    }
  }, [initialImageSrc]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하여야 합니다.');
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
        // 크롭 상태 초기화
        setCrop(undefined);
        setCompletedCrop(undefined);
      });
      reader.addEventListener('error', () => {
        console.error('Failed to read file:', reader.error);
        alert('이미지를 읽는 중 오류가 발생했습니다.');
      });
      reader.readAsDataURL(file);
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect || 16 / 3,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
    
    // onComplete에서 자동으로 completedCrop이 설정되므로 여기서는 설정하지 않음
  };

  const handleSave = async () => {
    if (!imgRef.current) {
      alert('이미지를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    // completedCrop은 사용자가 크롭 영역을 조정할 때마다 onComplete에서 자동 계산됨
    if (!completedCrop) {
      alert('크롭 영역을 설정해주세요.');
      return;
    }
    
    const cropToUse = completedCrop;

    try {
      const image = imgRef.current;
      if (!image.complete || image.naturalWidth === 0) {
        alert('이미지가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      const canvas = document.createElement('canvas');
      const pixelRatio = window.devicePixelRatio || 1;

      // 이미지의 표시 크기와 실제 크기의 비율 계산
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // completedCrop은 화면에 표시된 이미지 크기 기준이므로 실제 이미지 크기로 변환
      const actualCropX = cropToUse.x * scaleX;
      const actualCropY = cropToUse.y * scaleY;
      const actualCropWidth = cropToUse.width * scaleX;
      const actualCropHeight = cropToUse.height * scaleY;

      canvas.width = Math.round(actualCropWidth) * pixelRatio;
      canvas.height = Math.round(actualCropHeight) * pixelRatio;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context를 가져올 수 없습니다.');
      }

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      // 실제 이미지 크기 기준으로 크롭된 영역 그리기
      ctx.drawImage(
        image,
        Math.round(actualCropX),
        Math.round(actualCropY),
        Math.round(actualCropWidth),
        Math.round(actualCropHeight),
        0,
        0,
        Math.round(actualCropWidth),
        Math.round(actualCropHeight)
      );

      // Canvas를 Blob으로 변환 (Promise로 래핑)
      const blob = await new Promise<Blob | null>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Blob 생성에 실패했습니다.'));
            }
          },
          'image/png',
          0.95 // 품질 설정 (0.95로 변경하여 용량 최적화)
        );
      });

      if (!blob) {
        throw new Error('이미지 변환에 실패했습니다.');
      }

      // Blob을 Base64로 변환 (Promise로 래핑)
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('이미지 읽기에 실패했습니다.'));
          }
        };
        reader.onerror = () => {
          reject(new Error('파일 읽기 오류가 발생했습니다.'));
        };
        reader.readAsDataURL(blob);
      });

      // Electron API를 통해 이미지 저장
      if (window.electronAPI) {
        try {
          let savedImagePath = base64data; // 기본값: 파일 저장 실패 시 base64 사용
          
          if (window.electronAPI.saveStickerImage) {
            try {
              const saveResult = await window.electronAPI.saveStickerImage(base64data);
              if (saveResult && saveResult.success && saveResult.filePath) {
                savedImagePath = saveResult.filePath;
              } else {
                console.warn('Failed to save header image as file, using base64:', saveResult?.error);
              }
            } catch (error) {
              console.error('Error saving header image as file:', error);
              // 파일 저장 실패해도 base64로 계속 진행
            }
          }
          
          const dbResult = await window.electronAPI.dbSaveHeaderImage(savedImagePath);
          if (dbResult && dbResult.success) {
            onSave(savedImagePath);
            onClose();
          } else {
            throw new Error(dbResult?.error || '데이터베이스 저장에 실패했습니다.');
          }
        } catch (error) {
          console.error('Failed to save header image:', error);
          alert('헤더 이미지 저장에 실패했습니다. 다시 시도해주세요.');
        }
      } else {
        // Electron API가 없으면 로컬 스토리지에 저장
        try {
          localStorage.setItem('header-image', base64data);
          onSave(base64data);
          onClose();
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
          alert('이미지 저장에 실패했습니다. (localStorage 용량 초과 가능)');
        }
      }
    } catch (error) {
      console.error('Failed to save image:', error);
      alert(error instanceof Error ? error.message : '이미지 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="header-image-editor-overlay" onClick={onClose}>
      <div className="header-image-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="header-image-editor-header">
          <h2>헤더 이미지 편집</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="header-image-editor-content">
          {!imageSrc ? (
            <div className="upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onSelectFile}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                이미지 선택
              </button>
              <p className="help-text">배너 비율 (16:3)에 맞게 이미지를 자를 수 있습니다.</p>
            </div>
          ) : (
            <div className="crop-container">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspect}
                minWidth={100}
                minHeight={20}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imageSrc}
                  style={{ maxWidth: '100%' }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          )}
        </div>

        <div className="header-image-editor-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          {imageSrc && (
            <button className="btn btn-primary" onClick={handleSave}>
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

