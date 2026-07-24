import { useEffect, useCallback } from 'react';

const BLOCKED_KEYS = [
  'F12', 'F11', 'F5',
];

// Lockdown exam environment — detect and log violations (cannot fully block OS shortcuts)
export const useLockdown = (onViolation, enabled = true) => {
  const logViolation = useCallback(
    (type) => {
      if (enabled && onViolation) onViolation(type);
    },
    [enabled, onViolation]
  );

  useEffect(() => {
    if (!enabled) return;

    const requestFS = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn('Fullscreen request failed:', e);
      }
    };
    requestFS();

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('fullscreen_exit');
        requestFS();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) logViolation('tab_switch');
    };

    const handleBlur = () => logViolation('tab_switch');

    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      logViolation('copy_paste');
    };

    const handleKeyDown = (e) => {
      if (BLOCKED_KEYS.includes(e.key)) {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        const blocked = ['c', 'v', 'x', 'a', 'w', 't', 'n', 'p', 's', 'u', 'i', 'j'];
        if (blocked.includes(e.key.toLowerCase())) {
          e.preventDefault();
          if (['c', 'v', 'x'].includes(e.key.toLowerCase())) {
            logViolation('copy_paste');
          }
        }
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        logViolation('tab_switch');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, logViolation]);
};
