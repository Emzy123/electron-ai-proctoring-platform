const User = require('../models/User');
const Session = require('../models/Session');
const Violation = require('../models/Violation');
const { verifySocketToken } = require('../middleware/auth');

// In-memory active session monitor state
const activeMonitors = new Map();

const setupExamMonitor = (io) => {
  io.use(async (socket, next) => {
    const decoded = verifySocketToken(socket.handshake.auth?.token);
    if (!decoded) return next(new Error('Authentication error'));
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Student joins exam session room
    socket.on('exam:join', async ({ sessionId }) => {
      const session = await Session.findById(sessionId).populate('examId', 'title courseCode duration');
      if (!session) return;

      socket.join(`session:${sessionId}`);
      socket.sessionId = sessionId;

      activeMonitors.set(sessionId, {
        sessionId,
        studentId: session.studentId,
        studentName: socket.user.name,
        matricNo: socket.user.matricNo,
        examTitle: session.examId?.title,
        examId: session.examId?._id,
        duration: session.examId?.duration,
        startTime: session.startTime,
        violationCount: 0,
        lastSnapshot: session.lastSnapshot || null,
        connected: true,
        answersCount: session.answers.length,
      });

      broadcastMonitorUpdate(io);
    });

    socket.on('exam:heartbeat', async ({ sessionId }) => {
      await Session.findByIdAndUpdate(sessionId, {
        lastHeartbeat: new Date(),
      });
      const monitor = activeMonitors.get(sessionId);
      if (monitor) {
        monitor.connected = true;
        monitor.lastHeartbeat = new Date();
      }
    });

    socket.on('exam:snapshot', async ({ sessionId, imageBase64 }) => {
      await Session.findByIdAndUpdate(sessionId, { lastSnapshot: imageBase64 });
      const monitor = activeMonitors.get(sessionId);
      if (monitor) {
        monitor.lastSnapshot = imageBase64;
      }
      io.to('faculty:monitor').emit('monitor:snapshot', { sessionId, imageBase64 });
    });

    socket.on('exam:violation', async (data) => {
      const { sessionId, type, snapshot } = data;
      const session = await Session.findById(sessionId);
      if (!session) return;

      const violation = await Violation.create({
        sessionId,
        studentId: session.studentId,
        examId: session.examId,
        type,
        snapshot: snapshot || '',
        warningShown: true,
      });

      const monitor = activeMonitors.get(sessionId);
      if (monitor) monitor.violationCount++;

      io.to('faculty:monitor').emit('monitor:violation', { sessionId, violation });
      broadcastMonitorUpdate(io);
    });

    socket.on('exam:answer', async ({ sessionId, questionId, selectedOption }) => {
      const session = await Session.findById(sessionId);
      if (!session || session.status !== 'in-progress') return;

      const idx = session.answers.findIndex(
        (a) => a.questionId.toString() === questionId
      );
      if (idx >= 0) {
        session.answers[idx].selectedOption = selectedOption;
      } else {
        session.answers.push({ questionId, selectedOption });
      }
      await session.save();

      const monitor = activeMonitors.get(sessionId);
      if (monitor) monitor.answersCount = session.answers.length;

      io.to('faculty:monitor').emit('monitor:answer', {
        sessionId,
        questionId,
        selectedOption,
        answersCount: session.answers.length,
      });
    });

    socket.on('exam:sync', async ({ sessionId, answers, violations }) => {
      const session = await Session.findById(sessionId);
      if (!session) return;

      for (const ans of answers || []) {
        const idx = session.answers.findIndex(
          (a) => a.questionId.toString() === ans.questionId
        );
        if (idx >= 0) {
          session.answers[idx].selectedOption = ans.selectedOption;
        } else {
          session.answers.push(ans);
        }
      }
      session.syncStatus = 'synced';
      await session.save();

      if (violations?.length) {
        await Violation.insertMany(
          violations.map((v) => ({
            ...v,
            sessionId,
            studentId: session.studentId,
            examId: session.examId,
          }))
        );
      }
    });

    // Faculty joins monitoring room
    socket.on('faculty:join', () => {
      if (socket.user.role !== 'faculty') return;
      socket.join('faculty:monitor');
      broadcastMonitorUpdate(io);
    });

    socket.on('faculty:warn', ({ sessionId, message }) => {
      io.to(`session:${sessionId}`).emit('student:warning', { message });
    });

    // WebRTC Live Proctoring Signaling
    socket.on('webrtc:offer', ({ targetSocketId, offer, sessionId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:offer', { offer, senderSocketId: socket.id, sessionId });
      } else {
        socket.to('faculty:monitor').emit('webrtc:offer', { offer, senderSocketId: socket.id, sessionId });
      }
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer, sessionId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:answer', { answer, senderSocketId: socket.id, sessionId });
      } else {
        socket.to(`session:${sessionId}`).emit('webrtc:answer', { answer, senderSocketId: socket.id, sessionId });
      }
    });

    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate, sessionId }) => {
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:ice-candidate', { candidate, senderSocketId: socket.id, sessionId });
      } else {
        socket.to(`session:${sessionId}`).emit('webrtc:ice-candidate', { candidate, senderSocketId: socket.id, sessionId });
        socket.to('faculty:monitor').emit('webrtc:ice-candidate', { candidate, senderSocketId: socket.id, sessionId });
      }
    });

    socket.on('faculty:review-violation', async ({ violationId, status, comment }) => {
      const violation = await Violation.findByIdAndUpdate(
        violationId,
        { facultyReviewStatus: status, facultyComment: comment || '' },
        { new: true }
      );
      io.to('faculty:monitor').emit('monitor:violation-reviewed', violation);
    });

    socket.on('disconnect', () => {
      if (socket.sessionId) {
        const monitor = activeMonitors.get(socket.sessionId);
        if (monitor) monitor.connected = false;
        broadcastMonitorUpdate(io);
      }
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });

  // Periodic stale connection check
  setInterval(() => {
    const now = Date.now();
    for (const [id, monitor] of activeMonitors) {
      if (monitor.lastHeartbeat && now - new Date(monitor.lastHeartbeat).getTime() > 30000) {
        monitor.connected = false;
      }
    }
    broadcastMonitorUpdate(io);
  }, 15000);
};

const broadcastMonitorUpdate = (io) => {
  const sessions = Array.from(activeMonitors.values());
  io.to('faculty:monitor').emit('monitor:update', sessions);
};

const removeFromMonitor = (sessionId) => {
  activeMonitors.delete(sessionId);
};

module.exports = { setupExamMonitor, removeFromMonitor };
