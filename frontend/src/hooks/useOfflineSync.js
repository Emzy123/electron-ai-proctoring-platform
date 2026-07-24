import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import {
  queueAnswer,
  queueViolation,
  getPendingAnswers,
  getPendingViolations,
  markAnswersSynced,
  markViolationsSynced,
} from '../services/indexedDB';

// Manage offline exam data sync with IndexedDB + server
export const useOfflineSync = (sessionId) => {
  const [syncStatus, setSyncStatus] = useState(
    navigator.onLine ? 'online' : 'offline'
  );

  const flushPending = useCallback(async () => {
    if (!sessionId) return;

    const pendingAnswers = await getPendingAnswers(sessionId);
    const pendingViolations = await getPendingViolations(sessionId);

    if (pendingAnswers.length === 0 && pendingViolations.length === 0) return;

    try {
      if (pendingAnswers.length > 0) {
        await api.post(`/sessions/${sessionId}/sync`, {
          answers: pendingAnswers.map((a) => ({
            questionId: a.questionId,
            selectedOption: a.selectedOption,
          })),
        });
        await markAnswersSynced(pendingAnswers.map((a) => a.id));
      }

      const socket = getSocket();
      if (pendingViolations.length > 0) {
        if (socket?.connected) {
          for (const v of pendingViolations) {
            socket.emit('exam:violation', {
              sessionId,
              type: v.type,
              snapshot: v.snapshot,
            });
          }
        } else {
          await api.post('/violations/batch', {
            violations: pendingViolations.map((v) => ({
              sessionId,
              type: v.type,
              snapshot: v.snapshot,
              timestamp: v.timestamp,
            })),
          });
        }
        await markViolationsSynced(pendingViolations.map((v) => v.id));
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('offline');
    }
  }, [sessionId]);

  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      flushPending().finally(() => setSyncStatus('online'));
    };
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushPending]);

  const saveAnswer = useCallback(
    async (questionId, selectedOption) => {
      await queueAnswer(sessionId, questionId, selectedOption);

      if (navigator.onLine) {
        try {
          await api.patch(`/sessions/${sessionId}/answer`, {
            questionId,
            selectedOption,
          });
          const socket = getSocket();
          socket?.emit('exam:answer', { sessionId, questionId, selectedOption });
        } catch {
          setSyncStatus('offline');
        }
      } else {
        setSyncStatus('offline');
      }
    },
    [sessionId]
  );

  const saveViolation = useCallback(
    async (type, snapshot) => {
      await queueViolation(sessionId, type, snapshot);

      if (navigator.onLine) {
        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('exam:violation', { sessionId, type, snapshot });
        } else {
          try {
            await api.post('/violations', {
              sessionId,
              type,
              snapshot,
            });
          } catch {
            setSyncStatus('offline');
          }
        }
      } else {
        setSyncStatus('offline');
      }
    },
    [sessionId]
  );

  return { syncStatus, saveAnswer, saveViolation, flushPending };
};
