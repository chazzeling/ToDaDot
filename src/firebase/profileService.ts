/**
 * 사용자 프로필 Firestore 서비스
 */
import { 
  getFirestoreInstance, 
  getCurrentUser 
} from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc,
  Timestamp 
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  nickname: string;
  email: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 사용자 프로필 저장
 */
export async function saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const user = getCurrentUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const profileRef = doc(firestore, `users/${user.uid}/profile/info`);
  const existingProfile = await getDoc(profileRef);
  const existingData = existingProfile.exists() ? existingProfile.data() : null;

  await setDoc(profileRef, {
    uid: user.uid,
    email: user.email || '',
    nickname: profile.nickname || existingData?.nickname || user.email?.split('@')[0] || 'User',
    createdAt: existingData?.createdAt || Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });
}

/**
 * 사용자 프로필 불러오기
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  const firestore = getFirestoreInstance();
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const profileRef = doc(firestore, `users/${user.uid}/profile/info`);
  const snapshot = await getDoc(profileRef);
  
  if (!snapshot.exists()) {
    // 프로필이 없으면 기본 프로필 생성
    const defaultProfile: UserProfile = {
      uid: user.uid,
      nickname: user.email?.split('@')[0] || 'User',
      email: user.email || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveUserProfile(defaultProfile);
    return defaultProfile;
  }

  const data = snapshot.data();
  return {
    uid: data.uid,
    nickname: data.nickname || user.email?.split('@')[0] || 'User',
    email: data.email || user.email || '',
    createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toMillis() || Date.now(),
  } as UserProfile;
}

/**
 * 닉네임만 업데이트
 */
export async function updateNickname(nickname: string): Promise<void> {
  await saveUserProfile({ nickname });
}

