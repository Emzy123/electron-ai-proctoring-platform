require('dotenv').config();
const { consumeQueue } = require('../shared/queue');
const connectDB = require('../config/db');
const Session = require('../models/Session');
const { generateCSV } = require('../utils/csvExport');

connectDB();

consumeQueue('report_queue', async (data) => {
  console.log('Generating report for exam:', data.examId);
  if (data.type === 'csv') {
    const sessions = await Session.find({ examId: data.examId, status: 'submitted' })
      .populate('studentId', 'name matricNo');
    generateCSV(sessions, data.outputPath).catch(console.error);
  }
});

console.log('Report worker started');
