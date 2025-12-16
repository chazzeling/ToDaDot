/**
 * 닉네임 편집 컴포넌트
 */
import { useState, useEffect, useRef } from 'react';
import { PenLine, Check, X } from 'lucide-react';
import { updateNickname, getUserProfile, UserProfile } from '../firebase/profileService';
import './NicknameEditor.css';

interface NicknameEditorProps {
  className?: string;
}

export default function NicknameEditor({ className = '' }: NicknameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState<string>('');
  const [originalNickname, setOriginalNickname] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile();
      if (profile) {
        setNickname(profile.nickname);
        setOriginalNickname(profile.nickname);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setOriginalNickname(nickname);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (nickname.trim() === originalNickname) {
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await updateNickname(nickname.trim());
      setOriginalNickname(nickname.trim());
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to update nickname:', error);
      alert('닉네임 저장에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
      setNickname(originalNickname);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNickname(originalNickname);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (loading) {
    return (
      <span className={`nickname-editor ${className}`} style={{ opacity: 0.5 }}>
        로딩 중...
      </span>
    );
  }

  return (
    <div className={`nickname-editor ${className}`}>
      {isEditing ? (
        <div className="nickname-editor-edit">
          <input
            ref={inputRef}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={handleKeyDown}
            className="nickname-input"
            maxLength={20}
            disabled={saving}
          />
          <button
            className="nickname-btn save"
            onClick={handleSave}
            disabled={saving}
            title="저장"
          >
            <Check size={14} />
          </button>
          <button
            className="nickname-btn cancel"
            onClick={handleCancel}
            disabled={saving}
            title="취소"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="nickname-editor-display">
          <span className="nickname-text">{nickname}</span>
          <button
            className="nickname-btn edit"
            onClick={handleEdit}
            title="닉네임 편집"
          >
            <PenLine size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

