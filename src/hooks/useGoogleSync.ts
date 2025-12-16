import { useState, useEffect } from 'react';

/**
 * Google API 동기화 상태 관리 훅
 */
export function useGoogleSync() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    if (window.electronAPI) {
      try {
        const authenticated = await window.electronAPI.googleIsAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Failed to check auth status:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return {
    isAuthenticated,
    isLoading,
    refreshAuthStatus: checkAuthStatus,
  };
}











