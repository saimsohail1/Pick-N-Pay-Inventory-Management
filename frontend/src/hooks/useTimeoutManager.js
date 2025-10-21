import { useRef, useEffect } from 'react';

/**
 * Custom hook to manage timeouts and prevent memory leaks
 * Automatically clears all timeouts when component unmounts
 */
export const useTimeoutManager = () => {
  const timeouts = useRef([]);

  const addTimeout = (callback, delay) => {
    const id = setTimeout(callback, delay);
    timeouts.current.push(id);
    return id;
  };

  const clearAllTimeouts = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
  };

  const clearTimeout = (id) => {
    if (id) {
      window.clearTimeout(id);
      timeouts.current = timeouts.current.filter(timeoutId => timeoutId !== id);
    }
  };

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  return {
    addTimeout,
    clearAllTimeouts,
    clearTimeout
  };
};
