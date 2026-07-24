const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const generateSessionPDF = (session, exam, violations) => {
  const doc = new jsPDF();
  const student = session.studentId;

  doc.setFontSize(18);
  doc.text('CUSTECH Osara - Integrity Report', 14, 20);
  doc.setFontSize(11);
  doc.text(`Student: ${student?.name || 'N/A'} (${student?.matricNo || 'N/A'})`, 14, 32);
  doc.text(`Exam: ${exam?.title || 'N/A'} - ${exam?.courseCode || ''}`, 14, 40);
  doc.text(`Score: ${session.score ?? 'N/A'}% | Status: ${session.status}`, 14, 48);
  doc.text(`Started: ${new Date(session.startTime).toLocaleString()}`, 14, 56);

  doc.autoTable({
    startY: 65,
    head: [['Violation Type', 'Time', 'Review', 'Comment']],
    body: violations.map((v) => [
      v.type,
      new Date(v.timestamp).toLocaleString(),
      v.facultyReviewStatus,
      v.facultyComment || '',
    ]),
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.autoTable({
    startY: finalY,
    head: [['Question ID', 'Answer', 'Correct']],
    body: session.answers.map((a) => [
      a.questionId.toString().slice(-6),
      a.selectedOption ?? '-',
      a.isCorrect ? 'Yes' : 'No',
    ]),
  });

  return doc.output('arraybuffer');
};

module.exports = { generateSessionPDF };
