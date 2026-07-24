import { useState, useEffect, useCallback } from 'react';

export const useExamTimer = (durationMinutes, startTime, onExpire) => {
  const [remaining, setRemaining] = useState(durationMinutes * 60);

  const calcRemaining = useCallback(() => {
    if (!startTime || !durationMinutes) return 0;
    const end = new Date(startTime).getTime() + durationMinutes * 60 * 1000;
    return Math.max(0, Math.floor((end - Date.now()) / 1000));
  }, [durationMinutes, startTime]);

  useEffect(() => {
    setRemaining(calcRemaining());
    const interval = setInterval(() => {
      const rem = calcRemaining();
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [calcRemaining, onExpire]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return { remaining, formatted: formatTime(remaining), isExpired: remaining <= 0 };
};
