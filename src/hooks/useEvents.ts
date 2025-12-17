import { useState, useEffect, useRef } from 'react';
import { Event, DateString } from '../types';
import { useGoogleSync } from './useGoogleSync';
import { useFirebaseAuth } from './useFirebaseAuth';
import { extractMetadata, removeMetadataFromDescription, addMetadataToDescription } from '../utils/googleCalendarMetadata';
import * as eventService from '../firebase/eventService';

const STORAGE_KEY = 'events';

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isAuthenticated: isGoogleAuthenticated } = useGoogleSync();
  const { user, isAuthenticated: isFirebaseAuthenticated } = useFirebaseAuth();
  const hasSyncedFirebaseRef = useRef(false);

  // 이벤트 불러오기 (Google API 또는 로컬 스토리지)
  useEffect(() => {
    const loadEvents = async () => {
      // 먼저 로컬 스토리지에서 데이터 불러오기 (데이터 보존을 위해)
      const saved = localStorage.getItem(STORAGE_KEY);
      const localEvents: Event[] = saved ? (() => {
        try {
          return JSON.parse(saved) as Event[];
        } catch (error) {
          console.error('Failed to parse local events:', error);
          return [];
        }
      })() : [];

      // Firebase에서 불러오기 (인증된 경우, Google Calendar보다 우선)
      if (isFirebaseAuthenticated && user && !hasSyncedFirebaseRef.current) {
        try {
          const firebaseEvents = await eventService.getAllEvents();
          
          if (firebaseEvents.length > 0) {
            // Firebase 데이터와 로컬 데이터 병합 (로컬 데이터 우선)
            const mergedEvents = mergeEvents(localEvents, firebaseEvents);
            setEvents(mergedEvents);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEvents));
            hasSyncedFirebaseRef.current = true;
            return; // Firebase 데이터가 있으면 Google Calendar는 건너뜀
          } else if (localEvents.length > 0) {
            // Firebase에 데이터가 없고 로컬에만 있으면 Firebase에 저장
            await eventService.saveEventsBatch(localEvents);
            hasSyncedFirebaseRef.current = true;
          } else {
            hasSyncedFirebaseRef.current = true;
          }
        } catch (error) {
          console.error('Failed to load events from Firebase:', error);
        }
      }
      
      if (isGoogleAuthenticated && window.electronAPI) {
        // Google Calendar에서 불러오기
        try {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
          
          const timeMin = startOfMonth.toISOString();
          const timeMax = endOfMonth.toISOString();
          
          const result = await window.electronAPI.googleGetEvents(timeMin, timeMax);
          if (result.success && result.events) {
            console.log('🔄 데이터 마이그레이션: Google Calendar와 로컬 데이터 병합 중...');
            console.log(`   로컬 이벤트 수: ${localEvents.length}`);
            console.log(`   Google Calendar 이벤트 수: ${result.events.length}`);
            
            // Google Calendar 이벤트를 앱의 Event 형식으로 변환
            const googleEvents: Event[] = result.events.map((gEvent: any) => {
              const startDate = gEvent.start?.dateTime 
                ? new Date(gEvent.start.dateTime).toISOString().split('T')[0]
                : gEvent.start?.date || new Date().toISOString().split('T')[0];
              
              // 시간 추출
              const startTime = gEvent.start?.dateTime 
                ? new Date(gEvent.start.dateTime).toTimeString().slice(0, 5)
                : undefined;
              
              // description에서 메타데이터 추출
              const metadata = extractMetadata(gEvent.description);
              
              // 커스텀 색상이 있으면 사용, 없으면 Google Calendar 기본 색상 사용
              const color = metadata?.customColor || (gEvent.colorId ? `#${gEvent.colorId}` : '#4285f4');
              
              return {
                id: gEvent.id,
                title: gEvent.summary || '',
                date: startDate as DateString,
                color,
                categoryId: metadata?.categoryId, // 카테고리 ID 복원
                time: startTime,
                createdAt: new Date(gEvent.created || Date.now()).getTime(),
                googleEventId: gEvent.id, // Google 이벤트 ID 저장
              };
            });

            // 데이터 병합 로직: 로컬 데이터 보존 및 Google 데이터와 병합
            const mergedEvents = mergeLocalAndGoogleEvents(localEvents, googleEvents);
            console.log(`   병합된 이벤트 수: ${mergedEvents.length}`);
            console.log('✅ 데이터 마이그레이션 완료: 로컬 데이터가 보존되었습니다.');
            setEvents(mergedEvents);
          } else {
            // Google API 실패 시 로컬 데이터만 사용
            console.warn('⚠️ Google Calendar 동기화 실패, 로컬 데이터만 사용');
            setEvents(localEvents);
          }
        } catch (error) {
          console.error('Failed to load events from Google Calendar:', error);
          // 실패하면 로컬 스토리지 데이터 사용
          console.log('💾 로컬 데이터만 사용 (Google API 오류)');
          setEvents(localEvents);
        }
      } else {
        // Google API 미인증 시 로컬 스토리지 데이터만 사용
        setEvents(localEvents);
      }
    };

    loadEvents();
    
    // 분류 색상 변경 이벤트 리스너
    const handleCategoryUpdate = (e: CustomEvent) => {
      const { categoryId, color } = e.detail;
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.categoryId === categoryId ? { ...event, color } : event
        )
      );
    };
    
    window.addEventListener('eventCategoryUpdated', handleCategoryUpdate as EventListener);
    
    return () => {
      window.removeEventListener('eventCategoryUpdated', handleCategoryUpdate as EventListener);
    };
  }, [isGoogleAuthenticated, isFirebaseAuthenticated, user]);

  // 로컬 스토리지와 Firebase에 저장
  useEffect(() => {
    // localStorage에 저장 (항상)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    
    // Firebase에 저장 (인증된 경우)
    if (isFirebaseAuthenticated && user) {
      // 각 이벤트를 개별적으로 저장
      events.forEach(event => {
        eventService.saveEvent(event).catch(error => {
          console.error('Failed to save event to Firebase:', error);
        });
      });
    }
  }, [events, isFirebaseAuthenticated, user]);
  
  // 병합 함수: 로컬 데이터 우선
  const mergeEvents = (local: Event[], firebase: Event[]): Event[] => {
    const mergedMap = new Map<string, Event>();
    
    // Firebase 데이터 먼저 추가
    firebase.forEach(event => mergedMap.set(event.id, event));
    
    // 로컬 데이터로 덮어쓰기 (같은 ID가 있으면 로컬 데이터 우선)
    local.forEach(event => mergedMap.set(event.id, event));
    
    return Array.from(mergedMap.values());
  };

  const getEventsForDate = (date: DateString) => {
    return events.filter((event) => event.date === date);
  };

  const addEvent = async (date: DateString, title: string, color: string, categoryId?: string, time?: string, endDate?: DateString) => {
      if (isGoogleAuthenticated && window.electronAPI) {
      // Google Calendar에 추가
      try {
        const eventDateTime = new Date(date);
        if (time) {
          const [hours, minutes] = time.split(':').map(Number);
          eventDateTime.setHours(hours || 9, minutes || 0, 0, 0);
        } else {
          eventDateTime.setHours(9, 0, 0, 0); // 기본 시간 09:00
        }
        
        // 메타데이터 생성 (커스텀 색상과 카테고리 ID)
        const metadata = {
          customColor: color,
          categoryId: categoryId,
        };
        
        // description에 메타데이터 추가
        const description = addMetadataToDescription('', metadata);
        
        const googleEvent = {
          summary: title,
          description: description,
          start: {
            dateTime: eventDateTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: new Date(eventDateTime.getTime() + 60 * 60 * 1000).toISOString(), // 1시간 후
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          colorId: color.replace('#', ''), // Google Calendar 기본 색상 (메타데이터가 손실되면 폴백)
        };

        const result = await window.electronAPI.googleCreateEvent(googleEvent);
        if (result.success && result.event) {
          // Google Calendar에서 시간 추출
          const startTime = result.event.start?.dateTime 
            ? new Date(result.event.start.dateTime).toTimeString().slice(0, 5)
            : time || undefined;
          
          const newEvent: Event = {
            id: result.event.id,
            title: result.event.summary || title,
            date,
            endDate: endDate,
            color,
            categoryId: categoryId,
            time: startTime,
            createdAt: new Date(result.event.created || Date.now()).getTime(),
            googleEventId: result.event.id,
          };
          const updatedEvents = [...events, newEvent];
          setEvents(updatedEvents);
          // 로컬 스토리지에도 저장 (백업)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
        } else {
          throw new Error(result.error || 'Failed to create event');
        }
      } catch (error) {
        console.error('Failed to add event to Google Calendar:', error);
        // 실패하면 로컬에만 저장
        const newEvent: Event = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title,
          date,
          endDate: endDate,
          color,
          categoryId: categoryId,
          time: time,
          createdAt: Date.now(),
        };
        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        // 로컬 스토리지에도 저장
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      }
    } else {
      // Google API 미인증 시 로컬 스토리지에 저장
      const newEvent: Event = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title,
        date,
        endDate: endDate,
        color,
        categoryId: categoryId,
        time: time,
        createdAt: Date.now(),
      };
      const updatedEvents = [...events, newEvent];
      setEvents(updatedEvents);
      // 로컬 스토리지에도 저장
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
    }
  };

  const updateEvent = async (id: string, title: string, color: string, date?: DateString, categoryId?: string, time?: string, endDate?: DateString) => {
    const existingEvent = events.find(e => e.id === id);
    if (!existingEvent) {
      return;
    }

    console.log('📝 updateEvent 호출:', { id, title, time, timeType: typeof time, isUndefined: time === undefined, endDate });

    // 카테고리 ID는 명시적으로 전달되면 사용, 없으면 기존 값 유지
    const updatedCategoryId = categoryId !== undefined ? categoryId : existingEvent.categoryId;
    // endDate는 명시적으로 전달되면 사용, 없으면 기존 값 유지
    const updatedEndDate = endDate !== undefined ? endDate : existingEvent.endDate;

    if (isGoogleAuthenticated && window.electronAPI && existingEvent.googleEventId) {
      // Google Calendar 업데이트
      try {
        const eventDate = date || existingEvent.date;
        // 메타데이터 생성 (커스텀 색상과 카테고리 ID)
        const metadata = {
          customColor: color,
          categoryId: updatedCategoryId,
        };
        
        // 기존 description 가져오기 (Google Calendar에서 불러온 경우를 대비)
        // 업데이트 시에는 기존 description을 유지하면서 메타데이터만 업데이트
        const currentDescription = ''; // 업데이트 시에는 메타데이터만 관리
        const description = addMetadataToDescription(currentDescription, metadata);
        
        const eventDateTime = new Date(eventDate);
        
        // time이 undefined이면 all-day 이벤트로 처리
        if (time) {
          const [hours, minutes] = time.split(':').map(Number);
          eventDateTime.setHours(hours || 9, minutes || 0, 0, 0);
          
          const googleEvent = {
            summary: title,
            description: description,
            start: {
              dateTime: eventDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: new Date(eventDateTime.getTime() + 60 * 60 * 1000).toISOString(), // 1시간 후
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            colorId: color.replace('#', ''), // Google Calendar 기본 색상 (메타데이터가 손실되면 폴백)
          };
          
          const result = await window.electronAPI.googleUpdateEvent(existingEvent.googleEventId, googleEvent);
          if (result.success && result.event) {
            // Google Calendar에서 업데이트된 시간 추출
            const updatedTime = result.event.start?.dateTime 
              ? new Date(result.event.start.dateTime).toTimeString().slice(0, 5)
              : time;
            
            const updatedEvents = events.map((event) => 
              event.id === id 
                ? { 
                    ...event, 
                    title, 
                    color, 
                    date: eventDate,
                    endDate: updatedEndDate,
                    time: updatedTime,
                    categoryId: updatedCategoryId,
                    googleEventId: result.event?.id || existingEvent.googleEventId 
                  } 
                : event
            );
            setEvents(updatedEvents);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
          } else {
            throw new Error(result.error || 'Failed to update event');
          }
        } else {
          // time이 undefined이면 all-day 이벤트로 변경
          const googleEvent = {
            summary: title,
            description: description,
            start: {
              date: eventDate,
            },
            end: {
              date: eventDate,
            },
            colorId: color.replace('#', ''),
          };
          
          const result = await window.electronAPI.googleUpdateEvent(existingEvent.googleEventId, googleEvent);
          if (result.success && result.event) {
            const updatedEvents = events.map((event) => 
              event.id === id 
                ? { 
                    ...event, 
                    title, 
                    color, 
                    date: eventDate,
                    endDate: updatedEndDate,
                    time: undefined, // 시간 제거
                    categoryId: updatedCategoryId,
                    googleEventId: result.event?.id || existingEvent.googleEventId 
                  } 
                : event
            );
            setEvents(updatedEvents);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
          } else {
            throw new Error(result.error || 'Failed to update event');
          }
        }
      } catch (error) {
        console.error('❌ Failed to update event in Google Calendar:', error);
        // 실패하면 로컬만 업데이트
        const updatedEvents = events.map((event) => 
          event.id === id 
            ? { 
                ...event, 
                title, 
                color, 
                categoryId: updatedCategoryId,
                ...(date && { date }),
                ...(updatedEndDate !== undefined ? { endDate: updatedEndDate } : {}),
                ...(time !== undefined ? { time } : { time: undefined }) // 명시적으로 undefined로 설정
              } 
            : event
        );
        setEvents(updatedEvents);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
        console.log('💾 로컬에만 업데이트됨:', updatedEvents.find(e => e.id === id));
      }
    } else {
      // Google API 미인증 시 로컬만 업데이트
      const updatedEvents = events.map((event) => 
        event.id === id 
          ? { 
              ...event, 
              title, 
              color, 
              categoryId: updatedCategoryId,
              ...(date && { date }),
              ...(updatedEndDate !== undefined ? { endDate: updatedEndDate } : {}),
              ...(time !== undefined ? { time } : { time: undefined }) // 명시적으로 undefined로 설정
            } 
          : event
      );
      setEvents(updatedEvents);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      console.log('💾 로컬에만 업데이트됨 (Google API 미인증):', updatedEvents.find(e => e.id === id));
    }
  };

  const deleteEvent = async (id: string) => {
    const existingEvent = events.find(e => e.id === id);
    if (!existingEvent) {
      return;
    }

    // 함수형 업데이트를 사용하여 최신 상태 보장
    setEvents((prevEvents) => {
      const updatedEvents = prevEvents.filter((event) => event.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      return updatedEvents;
    });

    // Firebase에서도 삭제 (인증된 경우)
    if (isFirebaseAuthenticated && user) {
      eventService.deleteEvent(id).catch(error => {
        console.error('Failed to delete event from Firebase:', error);
      });
    }

    if (isGoogleAuthenticated && window.electronAPI && existingEvent.googleEventId) {
      // Google Calendar 삭제 (비동기, 실패해도 로컬은 이미 삭제됨)
      try {
        const result = await window.electronAPI.googleDeleteEvent(existingEvent.googleEventId);
        if (!result.success) {
          console.error('Failed to delete event from Google Calendar:', result.error);
        }
      } catch (error) {
        console.error('Failed to delete event from Google Calendar:', error);
      }
    }
  };

  // 로컬 이벤트와 Google Calendar 이벤트 병합 함수
  const mergeLocalAndGoogleEvents = (localEvents: Event[], googleEvents: Event[]): Event[] => {
    console.log('🔄 데이터 병합 시작...');
    
    // 1. 로컬에만 있는 이벤트 (googleEventId가 없는 이벤트) - 보존
    const localOnlyEvents = localEvents.filter(event => !event.googleEventId);
    console.log(`   로컬에만 있는 이벤트: ${localOnlyEvents.length}개 (보존됨)`);
    
    // 2. Google Calendar 이벤트를 Map으로 변환 (googleEventId를 키로)
    const googleEventsMap = new Map<string, Event>();
    googleEvents.forEach(event => {
      if (event.googleEventId) {
        googleEventsMap.set(event.googleEventId, event);
      }
    });
    
    // 3. 로컬 이벤트 중 Google과 매칭되는 이벤트 처리
    const mergedEvents: Event[] = [];
    const processedGoogleIds = new Set<string>();
    
    localEvents.forEach(localEvent => {
      if (localEvent.googleEventId) {
        // 로컬 이벤트가 Google과 연결되어 있는 경우
        const googleEvent = googleEventsMap.get(localEvent.googleEventId);
        if (googleEvent) {
          // Google 데이터가 있으면 Google 데이터 우선 (최신 데이터)
          // 단, 로컬 데이터의 createdAt이 더 최신이면 로컬 데이터 사용
          if (localEvent.createdAt > googleEvent.createdAt) {
            console.log(`   충돌 해결: 로컬 이벤트가 더 최신 (${localEvent.title})`);
            mergedEvents.push(localEvent);
          } else {
            console.log(`   충돌 해결: Google 이벤트가 더 최신 (${googleEvent.title})`);
            mergedEvents.push(googleEvent);
          }
          processedGoogleIds.add(localEvent.googleEventId);
        } else {
          // Google에 없는 경우 (삭제되었을 수 있음) - 로컬 데이터 보존
          console.log(`   Google에 없는 로컬 이벤트 보존: ${localEvent.title}`);
          mergedEvents.push(localEvent);
        }
      }
    });
    
    // 4. Google에만 있는 이벤트 추가
    googleEvents.forEach(googleEvent => {
      if (!processedGoogleIds.has(googleEvent.googleEventId || '')) {
        console.log(`   Google에만 있는 이벤트 추가: ${googleEvent.title}`);
        mergedEvents.push(googleEvent);
      }
    });
    
    // 5. 로컬에만 있는 이벤트 추가
    mergedEvents.push(...localOnlyEvents);
    
    console.log(`✅ 병합 완료: 총 ${mergedEvents.length}개 이벤트`);
    return mergedEvents;
  };

  // 수동 동기화 함수 (데이터 마이그레이션 로직 포함)
  const syncWithGoogle = async () => {
    if (!isGoogleAuthenticated || !window.electronAPI) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsSyncing(true);
    try {
      // 현재 로컬 이벤트 가져오기 (데이터 보존을 위해)
      const currentLocalEvents = [...events];
      console.log('🔄 동기화 시작: 로컬 데이터 보존 확인');
      console.log(`   현재 로컬 이벤트 수: ${currentLocalEvents.length}`);
      
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      
      const timeMin = startOfMonth.toISOString();
      const timeMax = endOfMonth.toISOString();
      
      const result = await window.electronAPI.googleGetEvents(timeMin, timeMax);
      if (result.success && result.events) {
        // Google Calendar 이벤트를 앱의 Event 형식으로 변환
        const googleEvents: Event[] = result.events.map((gEvent: any) => {
          const startDate = gEvent.start?.dateTime 
            ? new Date(gEvent.start.dateTime).toISOString().split('T')[0]
            : gEvent.start?.date || new Date().toISOString().split('T')[0];
          
          // 시간 추출
          const startTime = gEvent.start?.dateTime 
            ? new Date(gEvent.start.dateTime).toTimeString().slice(0, 5)
            : undefined;
          
          // description에서 메타데이터 추출
          const metadata = extractMetadata(gEvent.description);
          
          // 커스텀 색상이 있으면 사용, 없으면 Google Calendar 기본 색상 사용
          const color = metadata?.customColor || (gEvent.colorId ? `#${gEvent.colorId}` : '#4285f4');
          
          return {
            id: gEvent.id,
            title: gEvent.summary || '',
            date: startDate as DateString,
            color,
            categoryId: metadata?.categoryId,
            time: startTime,
            createdAt: new Date(gEvent.created || Date.now()).getTime(),
            googleEventId: gEvent.id,
          };
        });
        
        // 데이터 병합: 로컬 데이터 보존 및 Google 데이터와 병합
        const mergedEvents = mergeLocalAndGoogleEvents(currentLocalEvents, googleEvents);
        setEvents(mergedEvents);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedEvents));
        setIsSyncing(false);
        console.log('✅ 동기화 완료: 로컬 데이터가 보존되었습니다.');
        return { success: true };
      } else {
        setIsSyncing(false);
        return { success: false, error: result.error || 'Failed to sync' };
      }
    } catch (error: any) {
      setIsSyncing(false);
      console.error('❌ 동기화 실패, 로컬 데이터 보존:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    events,
    getEventsForDate,
    addEvent,
    updateEvent,
    deleteEvent,
    syncWithGoogle,
    isSyncing,
  };
}