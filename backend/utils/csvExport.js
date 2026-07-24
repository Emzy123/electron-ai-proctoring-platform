const generateSessionCSV = (session, exam, violations) => {
  const lines = [
    'CUSTECH Osara - Exam Integrity Report',
    `Student,${session.studentId?.name || 'N/A'}`,
    `Matric No,${session.studentId?.matricNo || 'N/A'}`,
    `Exam,${exam?.title || 'N/A'}`,
    `Course,${exam?.courseCode || 'N/A'}`,
    `Score,${session.score ?? 'N/A'}%`,
    `Status,${session.status}`,
    `Start,${session.startTime}`,
    `End,${session.endTime || 'N/A'}`,
    '',
    'Violations',
    'Type,Timestamp,Review Status,Comment',
  ];

  for (const v of violations) {
    lines.push(
      `${v.type},${v.timestamp},${v.facultyReviewStatus},"${(v.facultyComment || '').replace(/"/g, '""')}"`
    );
  }

  lines.push('', 'Answers', 'Question ID,Selected Option,Correct');
  for (const a of session.answers) {
    lines.push(`${a.questionId},${a.selectedOption ?? ''},${a.isCorrect ?? ''}`);
  }

  return lines.join('\n');
};

module.exports = { generateSessionCSV };
