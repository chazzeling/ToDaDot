import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'success' | 'error' | 'default';
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-content">
          {title && <h3 className="confirm-dialog-title">{title}</h3>}
          <p className="confirm-dialog-message">{message}</p>
        </div>
        <div className="confirm-dialog-buttons">
          {cancelText && (
            <button className="confirm-dialog-btn cancel-btn" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className={`confirm-dialog-btn confirm-btn ${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

