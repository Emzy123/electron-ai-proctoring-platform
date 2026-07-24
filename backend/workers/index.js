const { consumeQueue } = require('../shared/queue');
const Violation = require('../models/Violation');

const processFrameQueue = async (data) => {
  console.log('Processing frame:', data.evidenceId || data.sessionId);
  // Inference worker picks up from frame_queue when TF Serving available
};

const processViolationQueue = async (data) => {
  if (data.violationId) {
    await Violation.findByIdAndUpdate(data.violationId, {
      $set: { 'metadata.processed': true },
    }).catch(() => {});
  }
};

const processReportQueue = async (data) => {
  console.log('Processing report job:', data.reportId || data.examId);
};

const startWorkers = (io) => {
  consumeQueue('frame_queue', processFrameQueue);
  consumeQueue('violation_queue', processViolationQueue);
  consumeQueue('report_queue', processReportQueue);

  if (io) {
    io.on('connection', (socket) => {
      socket.on('webrtc:signal', ({ targetSessionId, signal }) => {
        io.to(`session:${targetSessionId}`).emit('webrtc:signal', signal);
      });
    });
  }
};

module.exports = { startWorkers };
