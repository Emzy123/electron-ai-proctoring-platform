import Dexie from 'dexie';

export const db = new Dexie('CustechExamDB');

db.version(1).stores({
  pendingAnswers: '++id, sessionId, questionId, synced',
  pendingViolations: '++id, sessionId, type, synced',
  examCache: 'sessionId',
});

export const cacheExam = async (sessionId, examData, answers) => {
  await db.examCache.put({ sessionId, examData, answers, updatedAt: Date.now() });
};

export const getCachedExam = async (sessionId) => {
  return db.examCache.get(sessionId);
};

export const queueAnswer = async (sessionId, questionId, selectedOption) => {
  await db.pendingAnswers.add({
    sessionId,
    questionId,
    selectedOption,
    synced: false,
    createdAt: Date.now(),
  });
};

export const queueViolation = async (sessionId, type, snapshot, timestamp) => {
  await db.pendingViolations.add({
    sessionId,
    type,
    snapshot: snapshot || '',
    timestamp: timestamp || new Date().toISOString(),
    synced: false,
  });
};

export const getPendingAnswers = async (sessionId) => {
  return db.pendingAnswers.where({ sessionId, synced: false }).toArray();
};

export const getPendingViolations = async (sessionId) => {
  return db.pendingViolations.where({ sessionId, synced: false }).toArray();
};

export const markAnswersSynced = async (ids) => {
  await db.pendingAnswers.where('id').anyOf(ids).modify({ synced: true });
};

export const markViolationsSynced = async (ids) => {
  await db.pendingViolations.where('id').anyOf(ids).modify({ synced: true });
};
